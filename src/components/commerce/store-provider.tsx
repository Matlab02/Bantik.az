"use client";
import {createContext,useContext,useEffect,useMemo,useState} from "react";
type CartItem={productId:string;quantity:number;variant?:string};
type Store={wishlist:string[];cart:CartItem[];toggleWishlist:(id:string)=>void;addToCart:(id:string,variant?:string)=>void;updateQuantity:(id:string,quantity:number)=>void;removeFromCart:(id:string)=>void;clearCart:()=>void;cartCount:number};
const StoreContext=createContext<Store|null>(null);
export function StoreProvider({children}:{children:React.ReactNode}){const [wishlist,setWishlist]=useState<string[]>([]);const [cart,setCart]=useState<CartItem[]>([]);const [ready,setReady]=useState(false);
  useEffect(()=>{try{setWishlist(JSON.parse(localStorage.getItem("bantik:wishlist")||"[]"));setCart(JSON.parse(localStorage.getItem("bantik:cart")||"[]"))}finally{setReady(true)}},[]);
  useEffect(()=>{if(ready)localStorage.setItem("bantik:wishlist",JSON.stringify(wishlist))},[wishlist,ready]);useEffect(()=>{if(ready)localStorage.setItem("bantik:cart",JSON.stringify(cart))},[cart,ready]);
  const value=useMemo<Store>(()=>({wishlist,cart,toggleWishlist:id=>setWishlist(x=>x.includes(id)?x.filter(v=>v!==id):[...x,id]),addToCart:(id,variant)=>setCart(x=>{const found=x.find(v=>v.productId===id&&v.variant===variant);return found?x.map(v=>v===found?{...v,quantity:v.quantity+1}:v):[...x,{productId:id,quantity:1,variant}]}),updateQuantity:(id,q)=>setCart(x=>q<1?x.filter(v=>v.productId!==id):x.map(v=>v.productId===id?{...v,quantity:q}:v)),removeFromCart:id=>setCart(x=>x.filter(v=>v.productId!==id)),clearCart:()=>setCart([]),cartCount:cart.reduce((a,b)=>a+b.quantity,0)}),[wishlist,cart]);return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>}
export function useStore(){const value=useContext(StoreContext);if(!value)throw new Error("useStore must be used inside StoreProvider");return value}
