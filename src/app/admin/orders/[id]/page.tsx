import { OrderDetail } from "@/components/admin/order-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <OrderDetail orderNumber={(await params).id} />; }
