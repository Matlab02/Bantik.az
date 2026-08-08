import{CustomersView}from"@/components/admin/management-views";export default async function Page({params}:{params:Promise<{id:string}>}){return<CustomersView id={(await params).id}/>}
