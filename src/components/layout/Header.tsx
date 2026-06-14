import React from 'react';
import { Sheet, SheetTrigger, SheetContent, SheetClose } from '@/components/ui/sheet';
import Link from 'next/link';
import { Menu, Bell, User, ClipboardList, ShoppingCart, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export const Header: React.FC<{ setIsNotificationsOpen: (open: boolean) => void }> = ({ setIsNotificationsOpen }) => {
  const { user, setUser } = useAuthStore();
  const router = useRouter();

  return (
    <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-[#FAFAFA]">
      <Sheet>
        <SheetTrigger render={<button className="bg-white border border-gray-100 shadow-sm p-2.5 rounded-full text-gray-700 hover:bg-gray-50 transition cursor-pointer" />}>
          <Menu size={20} />
        </SheetTrigger>
        <SheetContent side="left" className="w-[80%] max-w-[300px] p-0 bg-gray-50">
          <div className="bg-orange-500 p-6 pb-8 rounded-br-3xl shadow-inner">
            <h2 className="text-2xl font-display font-bold text-white mt-4">DineNDeliver</h2>
            <p className="text-orange-100 text-sm font-medium">
              Hello, {user?.full_name || 'Student'}!
            </p>
          </div>
          <div className="flex flex-col gap-2 p-6 mt-2">
            <SheetClose render={<Link href="/student/profile" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 p-3 rounded-2xl transition" />}> 
              <User size={20} /> <span className="font-bold">Profile</span>
            </SheetClose>
            <SheetClose render={<Link href="/student/orders" className="flex items-center gap-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 p-3 rounded-2xl transition" />}> 
              <ClipboardList size={20} /> <span className="font-bold">My Orders</span>
            </SheetClose>
            <SheetClose render={<Link href="/student/cart" className="flex items-center gap-4 text-gray-700 hover:bg-gray-100 p-3 rounded-2xl transition" />}> 
              <ShoppingCart size={20} /> <span className="font-bold">Cart</span>
            </SheetClose>
            <div className="h-px bg-gray-200 my-2" />
            <SheetClose render={<button onClick={() => { setUser(null); router.refresh(); }} className="flex items-center gap-4 text-red-500 hover:bg-red-50 p-3 rounded-2xl transition w-full text-left" />}> 
              <LogOut size={20} /> <span className="font-bold">Logout</span>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
      {/* Brand Logo */}
      <div className="flex items-center justify-center flex-1">
        <img src="/icons/icon-512x512.png" alt="DineNDeliver" className="h-8 object-contain" />
        <span className="font-bold text-xl ml-2 font-display text-gray-900 tracking-tight">
          DineN<span className="text-orange-600">Deliver</span>
        </span>
      </div>
      {/* Notifications */}
      <button
        onClick={() => setIsNotificationsOpen(true)}
        className="relative bg-white border border-gray-100 shadow-sm p-2.5 rounded-full text-gray-700 hover:bg-gray-50 transition cursor-pointer"
      >
        <Bell size={20} />
        <span className="absolute top-2 right-2 w-2 h-2 bg-orange-600 rounded-full border border-white" />
      </button>
    </div>
  );
};
