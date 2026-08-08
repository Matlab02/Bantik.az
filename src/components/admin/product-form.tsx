"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { brands, categories, getProduct } from "@/lib/catalog";
import { productSchema } from "@/lib/validation";

type Variant = {
  name: string;
  sku: string;
  color: string;
  hex: string;
  volume: string;
};

type EditorProduct = {
  name: string;
  slug: string;
  sku: string;
  barcode?: string;
  brandSlug: string;
  categorySlug: string;
  shortDescription?: string;
  description?: string;
  usageInstructions?: string;
  ingredients?: string;
  skinType?: string;
  productType?: string;
  price: number;
  compareAtPrice?: number;
  active: boolean;
  featured: boolean;
  isNew: boolean;
  bestseller: boolean;
  variants?: Variant[];
  images: string[];
};

const emptyVariant: Variant = {
  name: "Standart",
  sku: "",
  color: "",
  hex: "#d71920",
  volume: "",
};

export function ProductForm({ id }: { id?: string }) {
  const router = useRouter();
  const catalogProduct = id ? getProduct(id) : undefined;
  const [existing, setExisting] = useState<EditorProduct | undefined>(
    catalogProduct
      ? ({
          ...catalogProduct,
          variants: [
            {
              ...emptyVariant,
              sku: `${catalogProduct.sku}-01`,
              volume: catalogProduct.volumes[0] || "",
            },
          ],
        } as EditorProduct)
      : undefined,
  );
  const [loaded, setLoaded] = useState(!id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [variants, setVariants] = useState<Variant[]>(
    existing?.variants || [emptyVariant],
  );
  const [images, setImages] = useState<string[]>(existing?.images || [""]);

  useEffect(() => {
    if (!id) return;
    void fetch(`/api/admin/management/products?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace("/admin/login?expired=1");
          return undefined;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return result as EditorProduct;
      })
      .then((result) => {
        if (!result) return;
        setExisting(result);
        setVariants(result.variants?.length ? result.variants : [emptyVariant]);
        setImages(result.images.length ? result.images : [""]);
      })
      .catch((reason) =>
        setMessage(reason instanceof Error ? reason.message : "Məhsul yüklənmədi"),
      )
      .finally(() => setLoaded(true));
  }, [id]);

  async function submit(formData: FormData) {
    if (pending) return;
    const raw = Object.fromEntries(formData);
    const data = {
      ...raw,
      active: formData.get("active") === "on",
      featured: formData.get("featured") === "on",
      isNew: formData.get("isNew") === "on",
      bestseller: formData.get("bestseller") === "on",
      compareAtPrice: raw.compareAtPrice || undefined,
    };
    const parsed = productSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    setPending(true);
    setErrors({});
    setMessage("");
    try {
      const response = await fetch("/api/admin/management/products", {
        method: id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          id,
          variants,
          images: images.filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Məhsul saxlanılmadı");
      router.push("/admin/products");
      router.refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Məhsul saxlanılmadı");
    } finally {
      setPending(false);
    }
  }

  if (!loaded) return <p>Məhsul yüklənir…</p>;
  if (id && !existing) return <p className="form-error">{message || "Məhsul tapılmadı"}</p>;

  return (
    <form action={submit} className="admin-form">
      <section>
        <h2>Əsas məlumatlar</h2>
        <div className="form-grid">
          <Field name="name" label="Məhsul adı" value={existing?.name} error={errors.name} />
          <Field name="slug" label="Slug" value={existing?.slug} error={errors.slug} />
          <Field name="sku" label="SKU" value={existing?.sku} error={errors.sku} />
          <Field name="barcode" label="Barcode" value={existing?.barcode} />
          <label>
            Brend
            <select name="brandId" defaultValue={existing?.brandSlug}>
              {brands.map((brand) => (
                <option value={brand.slug} key={brand.slug}>{brand.name}</option>
              ))}
            </select>
          </label>
          <label>
            Kateqoriya
            <select name="categoryId" defaultValue={existing?.categorySlug}>
              {categories.map((category) => (
                <option value={category.slug} key={category.slug}>{category.name}</option>
              ))}
            </select>
          </label>
          <Field name="productType" label="Məhsul tipi" value={existing?.productType} />
          <Field name="skinType" label="Dəri tipi" value={existing?.skinType} />
          <Field name="price" label="Qiymət" type="number" value={existing?.price} error={errors.price} />
          <Field name="compareAtPrice" label="Köhnə qiymət" type="number" value={existing?.compareAtPrice} />
        </div>
        <TextField name="shortDescription" label="Qısa təsvir" value={existing?.shortDescription} />
        <TextField name="description" label="Təsvir" value={existing?.description} error={errors.description} />
        <TextField name="ingredients" label="Tərkib" value={existing?.ingredients} />
        <TextField name="usageInstructions" label="İstifadə qaydası" value={existing?.usageInstructions} />
      </section>

      <section>
        <h2>Variantlar</h2>
        {variants.map((variant, index) => (
          <div className="variant-row" key={`${index}-${variant.sku}`}>
            <input aria-label="Variant adı" placeholder="Ad" value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} />
            <input aria-label="Variant SKU" placeholder="SKU" value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value })} />
            <input aria-label="Variant rəngi" placeholder="Rəng" value={variant.color} onChange={(event) => updateVariant(index, { color: event.target.value })} />
            <input aria-label="Rəng kodu" type="color" value={variant.hex} onChange={(event) => updateVariant(index, { hex: event.target.value })} />
            <input aria-label="Həcm" placeholder="Həcm" value={variant.volume} onChange={(event) => updateVariant(index, { volume: event.target.value })} />
            <button type="button" aria-label="Variantı sil" disabled={variants.length === 1} onClick={() => setVariants((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 />
            </button>
          </div>
        ))}
        <button type="button" className="outline-btn" onClick={() => setVariants((items) => [...items, { ...emptyVariant, name: "" }])}>
          <Plus /> Variant əlavə et
        </button>
      </section>

      <section>
        <h2>Şəkillər</h2>
        {images.map((url, index) => (
          <div className="image-row" key={index}>
            <input aria-label={`Şəkil ${index + 1}`} value={url} placeholder="/products/image.png və ya https://…" onChange={(event) => setImages((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
            <span>{index === 0 ? "Əsas şəkil" : `Şəkil ${index + 1}`}</span>
            <button type="button" aria-label="Şəkli sil" disabled={images.length === 1} onClick={() => setImages((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 />
            </button>
          </div>
        ))}
        <button type="button" className="outline-btn" onClick={() => setImages((items) => [...items, ""])}>
          <Plus /> Şəkil əlavə et
        </button>
      </section>

      <section className="checkboxes">
        {([
          ["active", "Aktiv"],
          ["featured", "Featured"],
          ["isNew", "Yeni"],
          ["bestseller", "Bestseller"],
        ] as const).map(([name, label]) => (
          <label key={name}>
            <input type="checkbox" name={name} defaultChecked={name === "active" || Boolean(existing?.[name])} />
            {label}
          </label>
        ))}
      </section>
      <button className="admin-save" disabled={pending} aria-busy={pending}>
        {pending ? "Saxlanılır…" : "Məhsulu yadda saxla"}
      </button>
      <div aria-live="polite">{message && <p className="form-error">{message}</p>}</div>
    </form>
  );

  function updateVariant(index: number, values: Partial<Variant>) {
    setVariants((items) =>
      items.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item),
    );
  }
}

function Field({
  name,
  label,
  value,
  type = "text",
  error,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  error?: string;
}) {
  return (
    <label>
      {label}
      <input name={name} type={type} step={type === "number" ? "0.01" : undefined} defaultValue={value ?? ""} />
      {error && <em>{error}</em>}
    </label>
  );
}

function TextField({
  name,
  label,
  value,
  error,
}: {
  name: string;
  label: string;
  value?: string;
  error?: string;
}) {
  return (
    <label>
      {label}
      <textarea name={name} defaultValue={value} />
      {error && <em>{error}</em>}
    </label>
  );
}
