import {BranchesAdmin}from"@/components/admin/branches-admin";export default async function Page({params}:{params:Promise<{id:string}>}){return <BranchesAdmin id={(await params).id}/>}
