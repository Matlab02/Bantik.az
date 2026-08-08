import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import { assertSameOrigin, safeAssetUrl, safeInternalPath } from "@/lib/http-security";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { authError, requireStaff, type Staff } from "@/lib/rbac";
import { productSchema } from "@/lib/validation";
import { parseScheduledDate } from "@/lib/timezone";

const roles = [
  "SUPER_ADMIN",
  "ADMIN",
  "WAREHOUSE_MANAGER",
  "BRANCH_MANAGER",
  "SALES_STAFF",
] as const;

const settingsSchema = z.object({
  siteName: z.string().min(2),
  slogan: z.string().optional(),
  logoUrl: z.string(),
  faviconUrl: z.string(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  address: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  facebook: z.string().optional(),
  orderPrefix: z.string().min(2).max(8),
  defaultCity: z.string().min(2),
  checkoutMessage: z.string().optional(),
  defaultMinimumStock: z.coerce.number().int().min(0),
  lowStockBehavior: z.string(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
});

const userSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(roles),
  branchId: z.string().optional(),
});

const sectionSchema = z.object({
  id: z.string(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const heroSchema = z.object({
  id: z.string().optional(),
  desktopImage: z.string().min(1),
  mobileImage: z.string().min(1),
  title: z.string().min(2),
  subtitle: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  alignment: z.enum(["LEFT", "CENTER", "RIGHT"]),
  active: z.boolean(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  sortOrder: z.number().int(),
});

const bannerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  desktopImage: z.string().min(1),
  mobileImage: z.string().min(1),
  title: z.string().min(2),
  subtitle: z.string().optional(),
  ctaText: z.string().optional(),
  link: z.string().optional(),
  active: z.boolean(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  position: z.string().min(2),
  sortOrder: z.number().int(),
});

const adminProductSchema = productSchema.extend({
  id: z.string().optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        sku: z.string().optional(),
        color: z.string().optional(),
        hex: z.string().optional(),
        volume: z.string().optional(),
      }),
    )
    .min(1),
  images: z.array(z.string()).min(1),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    if (!db) throw new Error("DATABASE_UNAVAILABLE");
    const staff = await requireStaff();
    const resource = (await params).resource;
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 64);

    if (resource === "settings") {
      return NextResponse.json(
        await db.siteSetting.findUnique({ where: { id: "default" } }),
      );
    }

    if (resource === "cms") {
      return NextResponse.json({
        sections: await db.cmsSection.findMany({
          orderBy: { sortOrder: "asc" },
        }),
        heroes: await db.heroSlide.findMany({ orderBy: { sortOrder: "asc" } }),
        banners: await db.campaignBanner.findMany({
          orderBy: [{ position: "asc" }, { sortOrder: "asc" }],
        }),
      });
    }

    if (resource === "users") {
      await requireStaff(["SUPER_ADMIN"]);
      return NextResponse.json({
        users: await db.user.findMany({
          where: { role: { not: "CUSTOMER" } },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            branchId: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        branches: await db.branch.findMany({ where: { isActive: true } }),
        roles,
      });
    }

    if (resource === "products") {
      await requireStaff(["SUPER_ADMIN", "ADMIN"]);
      const id = url.searchParams.get("id");
      if (id) {
        const item = await db.product.findFirst({
          where: { OR: [{ id }, { slug: id }] },
          include: {
            brand: true,
            category: true,
            variants: true,
            images: { orderBy: { position: "asc" } },
          },
        });
        if (!item) return NextResponse.json({ error: "Məhsul tapılmadı" }, { status: 404 });
        return NextResponse.json({
          ...item,
          price: Number(item.price),
          compareAtPrice: item.compareAtPrice
            ? Number(item.compareAtPrice)
            : undefined,
          brandSlug: item.brand.slug,
          categorySlug: item.category.slug,
          variants: item.variants.map((variant) => ({
            name: variant.name,
            sku: variant.sku,
            color: variant.colorName || "",
            hex: variant.colorHex || "#d71920",
            volume: variant.volume || "",
          })),
          images: item.images.map((image) => image.url),
        });
      }
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const pageSize = Math.min(
        100,
        Math.max(10, Number(url.searchParams.get("pageSize") || 25)),
      );
      const where = q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { sku: { contains: q, mode: "insensitive" as const } },
              { barcode: { contains: q } },
            ],
          }
        : undefined;
      const [items, total] = await db.$transaction([
        db.product.findMany({
          where,
          include: { brand: true, category: true, images: { take: 1 } },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.product.count({ where }),
      ]);
      return NextResponse.json({
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          price: Number(item.price),
          active: item.active,
          brand: item.brand.name,
          category: item.category.name,
          image: item.images[0]?.url,
        })),
        pagination: {
          page,
          pageSize,
          total,
          pages: Math.ceil(total / pageSize),
        },
      });
    }

    if (resource === "notifications") {
      return NextResponse.json({
        items: await db.adminNotification.findMany({
          where: { OR: [{ userId: staff.id }, { userId: null }] },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        unread: await db.adminNotification.count({
          where: {
            OR: [{ userId: staff.id }, { userId: null }],
            readAt: null,
          },
        }),
      });
    }

    if (resource === "search") {
      const limited = await rateLimit("admin-search", `${staff.id}:${clientIp(request)}`, {
        limit: 40,
        windowMs: 60_000,
      });
      if (!limited.allowed) {
        return NextResponse.json(
          { error: "Axtarış limiti keçildi." },
          { status: 429, headers: { "retry-after": String(limited.retryAfter) } },
        );
      }
      if (q.length < 2) {
        return NextResponse.json({
          orders: [],
          products: [],
          branches: [],
          transfers: [],
        });
      }
      const branchOnly =
        staff.role === "BRANCH_MANAGER" || staff.role === "SALES_STAFF"
          ? staff.branchId
          : undefined;
      const [orders, products, branches, transfers] = await Promise.all([
        db.order.findMany({
          where: {
            assignedBranchId: branchOnly,
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { customerName: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 6,
        }),
        db.product.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q } },
              { brand: { name: { contains: q, mode: "insensitive" } } },
            ],
          },
          include: { brand: true },
          take: 6,
        }),
        db.branch.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 6,
        }),
        db.stockTransfer.findMany({
          where: { transferNumber: { contains: q, mode: "insensitive" } },
          take: 6,
        }),
      ]);
      return NextResponse.json({
        orders: orders.map((item) => ({
          id: item.orderNumber,
          label: item.orderNumber,
          detail: `${item.customerName} · ${item.phone}`,
          href: `/admin/orders/${item.orderNumber}`,
        })),
        products: products.map((item) => ({
          id: item.id,
          label: item.name,
          detail: `${item.brand.name} · ${item.sku}`,
          href: `/admin/products/${item.slug}`,
        })),
        branches: branches.map((item) => ({
          id: item.id,
          label: item.name,
          detail: item.code,
          href: `/admin/branches/${item.id}`,
        })),
        transfers: transfers.map((item) => ({
          id: item.id,
          label: item.transferNumber,
          detail: item.status,
          href: "/admin/transfers",
        })),
      });
    }

    if (resource === "audit") {
      await requireStaff(["SUPER_ADMIN", "ADMIN"]);
      const action = url.searchParams.get("action");
      const entityType = url.searchParams.get("entityType");
      const date = url.searchParams.get("date");
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 50)));
      const where = {
            action: action || undefined,
            entityType: entityType || undefined,
            createdAt: date
              ? {
                  gte: new Date(`${date}T00:00:00`),
                  lt: new Date(`${date}T23:59:59`),
                }
              : undefined,
          };
      const [items, total] = await db.$transaction([
        db.auditLog.findMany({
          where,
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.auditLog.count({ where }),
      ]);
      return NextResponse.json({
        items,
        pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
      });
    }

    if (resource === "customers") {
      await requireStaff(["SUPER_ADMIN", "ADMIN"]);
      const id = url.searchParams.get("id");
      if (id) {
        return NextResponse.json(
          await db.customer.findUnique({
            where: { id },
            include: {
              addresses: true,
              orders: {
                include: { items: true },
                orderBy: { createdAt: "desc" },
              },
            },
          }),
        );
      }
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 50)));
      const [customers, total] = await db.$transaction([
        db.customer.findMany({
          include: { orders: true, addresses: true },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.customer.count(),
      ]);
      return NextResponse.json({
        items: customers.map((customer) => ({
          ...customer,
          orderCount: customer.orders.length,
          totalRequested: customer.orders.reduce(
            (sum, order) => sum + Number(order.total),
            0,
          ),
          deliveredValue: customer.orders
            .filter((order) => order.status === "DELIVERED")
            .reduce((sum, order) => sum + Number(order.total), 0),
          lastOrder: [...customer.orders].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          )[0]?.createdAt,
        })),
        pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
      });
    }

    if (resource === "security") {
      await requireStaff(["SUPER_ADMIN"]);
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 50)));
      const [items, total] = await db.$transaction([
        db.loginHistory.findMany({
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.loginHistory.count(),
      ]);
      return NextResponse.json({
        items,
        pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
      });
    }

    if (resource === "profile") {
      return NextResponse.json(
        await db.user.findUnique({
          where: { id: staff.id },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            branchId: true,
          },
        }),
      );
    }

    return NextResponse.json({ error: "Resurs tapılmadı" }, { status: 404 });
  } catch (error) {
    const parsed = authError(error);
    return NextResponse.json(
      { error: parsed.status === 400 ? "Məlumat yüklənmədi" : parsed.message },
      { status: parsed.status },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    if (!db) throw new Error("DATABASE_UNAVAILABLE");
    assertSameOrigin(request);
    const staff = await requireStaff();
    const resource = (await params).resource;
    const raw: unknown = await request.json();

    if (resource === "users") {
      await requireStaff(["SUPER_ADMIN"]);
      const data = userSchema.parse(raw);
      const user = await db.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          passwordHash: await bcrypt.hash(data.password, 12),
          role: data.role,
          branchId: data.branchId || undefined,
          isActive: true,
        },
      });
      await audit(staff, "USER_CREATED", "User", user.id, undefined, {
        email: user.email,
        role: user.role,
      });
      return NextResponse.json({ id: user.id }, { status: 201 });
    }


    if (resource === "products") {
      await requireStaff(["SUPER_ADMIN", "ADMIN"]);
      const data = adminProductSchema.parse(raw);
      const [brand, category] = await Promise.all([
        db.brand.findFirst({
          where: { OR: [{ id: data.brandId }, { slug: data.brandId }] },
        }),
        db.category.findFirst({
          where: { OR: [{ id: data.categoryId }, { slug: data.categoryId }] },
        }),
      ]);
      if (!brand || !category) throw new Error("Brend və ya kateqoriya tapılmadı");
      const images = data.images.filter(Boolean).map((url, position) => ({
        url: safeAssetUrl(url),
        alt: `${brand.name} ${data.name}`,
        position,
        isPrimary: position === 0,
      }));
      if (!images.length) throw new Error("Ən azı bir təhlükəsiz şəkil tələb olunur");
      const item = await db.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          sku: data.sku,
          barcode: data.barcode || null,
          shortDescription: data.shortDescription,
          description: data.description,
          usageInstructions: data.usageInstructions,
          ingredients: data.ingredients,
          skinType: data.skinType,
          productType: data.productType,
          price: data.price,
          compareAtPrice: data.compareAtPrice || null,
          brandId: brand.id,
          categoryId: category.id,
          active: data.active,
          featured: data.featured,
          isNew: data.isNew,
          bestseller: data.bestseller,
          images: { create: images },
          variants: {
            create: data.variants.map((variant, index) => ({
              name: variant.name,
              sku: variant.sku || `${data.sku}-${String(index + 1).padStart(2, "0")}`,
              colorName: variant.color || null,
              colorHex: variant.hex || null,
              volume: variant.volume || null,
              active: true,
            })),
          },
        },
      });
      await audit(staff, "PRODUCT_CREATED", "Product", item.id, undefined, {
        slug: item.slug,
        sku: item.sku,
      });
      return NextResponse.json({ id: item.id, slug: item.slug }, { status: 201 });
    }

    if (resource === "cms") {
      await requireStaff(["SUPER_ADMIN", "ADMIN"]);
      const action = z.object({ action: z.string() }).parse(raw).action;
      if (action === "SECTION") {
        const data = sectionSchema.parse(raw);
        const before = await db.cmsSection.findUniqueOrThrow({
          where: { id: data.id },
        });
        const item = await db.cmsSection.update({
          where: { id: data.id },
          data: { enabled: data.enabled, sortOrder: data.sortOrder },
        });
        await audit(
          staff,
          "CMS_SECTION_UPDATED",
          "CmsSection",
          item.id,
          before,
          item,
        );
        return NextResponse.json(item);
      }
      if (action === "HERO") {
        const data = heroSchema.parse(raw);
        const values = {
          desktopImage: safeAssetUrl(data.desktopImage),
          mobileImage: safeAssetUrl(data.mobileImage),
          title: data.title,
          subtitle: data.subtitle,
          ctaText: data.ctaText,
          ctaLink: safeInternalPath(data.ctaLink, "/products"),
          alignment: data.alignment,
          active: data.active,
          startAt: parseScheduledDate(data.startAt),
          endAt: parseScheduledDate(data.endAt),
          sortOrder: data.sortOrder,
        };
        if (values.startAt && values.endAt && values.startAt >= values.endAt) {
          throw new Error("Schedule başlanğıcı bitmə vaxtından əvvəl olmalıdır");
        }
        const item = data.id
          ? await db.heroSlide.update({ where: { id: data.id }, data: values })
          : await db.heroSlide.create({ data: values });
        await audit(staff, "HERO_SAVED", "HeroSlide", item.id, undefined, item);
        return NextResponse.json(item);
      }
      if (action === "BANNER") {
        const data = bannerSchema.parse(raw);
        const values = {
          name: data.name,
          desktopImage: safeAssetUrl(data.desktopImage),
          mobileImage: safeAssetUrl(data.mobileImage),
          title: data.title,
          subtitle: data.subtitle,
          ctaText: data.ctaText,
          link: safeInternalPath(data.link, "/products"),
          active: data.active,
          startAt: parseScheduledDate(data.startAt),
          endAt: parseScheduledDate(data.endAt),
          position: data.position,
          sortOrder: data.sortOrder,
        };
        if (values.startAt && values.endAt && values.startAt >= values.endAt) {
          throw new Error("Schedule başlanğıcı bitmə vaxtından əvvəl olmalıdır");
        }
        const item = data.id
          ? await db.campaignBanner.update({
              where: { id: data.id },
              data: values,
            })
          : await db.campaignBanner.create({ data: values });
        await audit(
          staff,
          "BANNER_SAVED",
          "CampaignBanner",
          item.id,
          undefined,
          item,
        );
        return NextResponse.json(item);
      }
    }

    return NextResponse.json({ error: "Əməliyyat tanınmadı" }, { status: 400 });
  } catch (error) {
    return mutationError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    if (!db) throw new Error("DATABASE_UNAVAILABLE");
    assertSameOrigin(request);
    const staff = await requireStaff();
    const resource = (await params).resource;
    const raw: unknown = await request.json();

    if (resource === "settings") {
      await requireStaff(["SUPER_ADMIN", "ADMIN"]);
      const parsed = settingsSchema.parse(raw);
      const data = {
        ...parsed,
        logoUrl: safeAssetUrl(parsed.logoUrl),
        faviconUrl: safeAssetUrl(parsed.faviconUrl),
        ogImageUrl: parsed.ogImageUrl ? safeAssetUrl(parsed.ogImageUrl) : parsed.ogImageUrl,
      };
      const before = await db.siteSetting.findUnique({
        where: { id: "default" },
      });
      const settings = await db.siteSetting.upsert({
        where: { id: "default" },
        create: { id: "default", ...data, updatedById: staff.id },
        update: { ...data, updatedById: staff.id },
      });
      await audit(
        staff,
        "SETTINGS_UPDATED",
        "SiteSetting",
        settings.id,
        before,
        settings,
      );
      return NextResponse.json(settings);
    }

    if (resource === "products") {
      await requireStaff(["SUPER_ADMIN", "ADMIN"]);
      const action = z
        .object({ action: z.literal("DEACTIVATE"), id: z.string() })
        .safeParse(raw);
      if (action.success) {
        const before = await db.product.findUniqueOrThrow({
          where: { id: action.data.id },
        });
        const item = await db.product.update({
          where: { id: action.data.id },
          data: { active: false },
        });
        await audit(staff, "PRODUCT_DEACTIVATED", "Product", item.id, before, item);
        return NextResponse.json({ id: item.id });
      }
      const data = adminProductSchema.parse(raw);
      if (!data.id) throw new Error("Məhsul ID tələb olunur");
      const existing = await db.product.findFirstOrThrow({
        where: { OR: [{ id: data.id }, { slug: data.id }] },
        include: { variants: { orderBy: { id: "asc" } } },
      });
      const [brand, category] = await Promise.all([
        db.brand.findFirst({
          where: { OR: [{ id: data.brandId }, { slug: data.brandId }] },
        }),
        db.category.findFirst({
          where: { OR: [{ id: data.categoryId }, { slug: data.categoryId }] },
        }),
      ]);
      if (!brand || !category) throw new Error("Brend və ya kateqoriya tapılmadı");
      const images = data.images.filter(Boolean).map((url, position) => ({
        productId: existing.id,
        url: safeAssetUrl(url),
        alt: `${brand.name} ${data.name}`,
        position,
        isPrimary: position === 0,
      }));
      await db.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            slug: data.slug,
            sku: data.sku,
            barcode: data.barcode || null,
            shortDescription: data.shortDescription,
            description: data.description,
            usageInstructions: data.usageInstructions,
            ingredients: data.ingredients,
            skinType: data.skinType,
            productType: data.productType,
            price: data.price,
            compareAtPrice: data.compareAtPrice || null,
            brandId: brand.id,
            categoryId: category.id,
            active: data.active,
            featured: data.featured,
            isNew: data.isNew,
            bestseller: data.bestseller,
          },
        });
        await tx.productImage.deleteMany({ where: { productId: existing.id } });
        if (images.length) await tx.productImage.createMany({ data: images });
        for (const [index, variant] of data.variants.entries()) {
          const values = {
            name: variant.name,
            sku:
              variant.sku ||
              existing.variants[index]?.sku ||
              `${data.sku}-${String(index + 1).padStart(2, "0")}`,
            colorName: variant.color || null,
            colorHex: variant.hex || null,
            volume: variant.volume || null,
            active: true,
          };
          if (existing.variants[index]) {
            await tx.productVariant.update({
              where: { id: existing.variants[index].id },
              data: values,
            });
          } else {
            await tx.productVariant.create({
              data: { ...values, productId: existing.id },
            });
          }
        }
      });
      await audit(staff, "PRODUCT_UPDATED", "Product", existing.id, existing, {
        slug: data.slug,
        sku: data.sku,
      });
      return NextResponse.json({ id: existing.id, slug: data.slug });
    }

    if (resource === "users") {
      await requireStaff(["SUPER_ADMIN"]);
      const data = z
        .object({
          id: z.string(),
          role: z.enum(roles).optional(),
          branchId: z.string().nullable().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(raw);
      if (data.id === staff.id && data.isActive === false) {
        throw new Error("Öz hesabınızı deaktiv edə bilməzsiniz");
      }
      const before = await db.user.findUniqueOrThrow({
        where: { id: data.id },
      });
      const user = await db.user.update({
        where: { id: data.id },
        data: {
          role: data.role,
          branchId: data.branchId,
          isActive: data.isActive,
        },
      });
      await audit(
        staff,
        "USER_UPDATED",
        "User",
        user.id,
        {
          role: before.role,
          branchId: before.branchId,
          isActive: before.isActive,
        },
        { role: user.role, branchId: user.branchId, isActive: user.isActive },
      );
      return NextResponse.json({ id: user.id });
    }

    if (resource === "notifications") {
      const data = z
        .object({ id: z.string().optional(), all: z.boolean().optional() })
        .parse(raw);
      if (data.all) {
        await db.adminNotification.updateMany({
          where: {
            OR: [{ userId: staff.id }, { userId: null }],
            readAt: null,
          },
          data: { readAt: new Date() },
        });
      } else if (data.id) {
        await db.adminNotification.updateMany({
          where: {
            id: data.id,
            OR: [{ userId: staff.id }, { userId: null }],
          },
          data: { readAt: new Date() },
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (resource === "profile") {
      const data = z
        .object({
          name: z.string().min(2).optional(),
          email: z.email().optional(),
          phone: z.string().optional(),
          currentPassword: z.string().optional(),
          newPassword: z.string().min(8).optional(),
          confirmPassword: z.string().optional(),
        })
        .parse(raw);
      const user = await db.user.findUniqueOrThrow({ where: { id: staff.id } });
      if (data.newPassword) {
        const limited = await rateLimit("password-change", staff.id, {
          limit: 5,
          windowMs: 60 * 60_000,
        });
        if (!limited.allowed) throw new Error("RATE_LIMITED");
        if (data.newPassword !== data.confirmPassword) {
          throw new Error("Yeni parollar uyğun deyil");
        }
        if (
          !data.currentPassword ||
          !user.passwordHash ||
          !(await bcrypt.compare(data.currentPassword, user.passwordHash))
        ) {
          throw new Error("Cari parol yanlışdır");
        }
      }
      const updated = await db.user.update({
        where: { id: staff.id },
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          passwordHash: data.newPassword
            ? await bcrypt.hash(data.newPassword, 12)
            : undefined,
        },
      });
      await audit(staff, "PROFILE_UPDATED", "User", staff.id, undefined, {
        name: updated.name,
        email: updated.email,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Əməliyyat tanınmadı" }, { status: 400 });
  } catch (error) {
    return mutationError(error);
  }
}

function json(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function audit(
  staff: Staff,
  action: string,
  entityType: string,
  entityId: string,
  before?: unknown,
  after?: unknown,
) {
  if (!db) return;
  await db.auditLog.create({
    data: {
      userId: staff.id === "demo-admin" ? undefined : staff.id,
      action,
      entityType,
      entityId,
      before: json(before),
      after: json(after),
    },
  });
}

function mutationError(error: unknown) {
  const parsed = authError(error);
  const message =
    error instanceof z.ZodError
      ? error.issues[0]?.message
      : parsed.status === 400
        ? error instanceof Error
          ? error.message
          : "Əməliyyat alınmadı"
        : parsed.message;
  return NextResponse.json({ error: message }, { status: parsed.status });
}
