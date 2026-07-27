'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { dokanService, VendorServiceAreaTerm } from '@/services/dokan.service';
import { logoutVendor } from '@/app/actions/auth';
import { Store, MapPin, UploadCloud, Link as LinkIcon, LogOut } from 'lucide-react';

type ProfileFormValues = {
  store_name: string;
  phone: string;
  address: string;
  social: {
    instagram: string;
    twitter: string;
    whatsapp: string;
    telegram: string;
  };
  service_area_id: string;
  latitude: string;
  longitude: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<ProfileFormValues>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [serviceAreaOptions, setServiceAreaOptions] = useState<VendorServiceAreaTerm[]>([]);
  
  // States for handling file uploads seamlessly
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [settingsData, locationData, serviceAreasData] = await Promise.all([
        dokanService.getStoreSettings(),
        dokanService.getVendorServiceArea(),
        dokanService.getServiceAreas(),
      ]);

      setServiceAreaOptions(Array.isArray(serviceAreasData?.locations) ? serviceAreasData.locations : []);

      // Populate form
      setValue('store_name', settingsData.store_name ?? '');
      setValue('phone', settingsData.phone ?? '');
      setValue('address', settingsData.address?.street_1 ?? '');
      setValue('social.instagram', settingsData.social?.instagram ?? '');
      setValue('social.twitter', settingsData.social?.twitter ?? '');
      setValue('social.whatsapp', settingsData.social?.whatsapp ?? '');
      setValue('social.telegram', settingsData.social?.telegram ?? '');

      setValue('service_area_id', locationData.service_area?.id ? String(locationData.service_area.id) : '');
      setValue('latitude', locationData.latitude ?? '');
      setValue('longitude', locationData.longitude ?? '');
    } catch (error) {
      console.error('Failed to load profile', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      let avatarId = null;
      let bannerId = null;

      // 1. Handle Headless Media Uploads First
      if (avatarFile) {
        avatarId = await dokanService.uploadMedia(avatarFile);
      }
      if (bannerFile) {
        bannerId = await dokanService.uploadMedia(bannerFile);
      }

      // 2. Prepare payload exactly as Dokan expects
      const payload: any = {
        store_name: data.store_name,
        phone: data.phone,
        address: {
          street_1: data.address,
        },
        social: {
          instagram: data.social.instagram,
          twitter: data.social.twitter,
          whatsapp: data.social.whatsapp,
          telegram: data.social.telegram,
        }
      };

      // Only append media IDs if new files were uploaded
      if (avatarId) payload.gravatar = avatarId;
      if (bannerId) payload.banner = bannerId;

      const parsedServiceAreaId = Number(data.service_area_id || 0);

      // 3. Update settings and location
      await Promise.all([
        dokanService.updateStoreSettings(payload),
        dokanService.updateVendorServiceArea({
          service_area_id: Number.isFinite(parsedServiceAreaId) && parsedServiceAreaId > 0 ? parsedServiceAreaId : 0,
          latitude: (data.latitude || '').trim(),
          longitude: (data.longitude || '').trim(),
        }),
      ]);

      alert('پروفایل با موفقیت بروزرسانی شد.');
      
      // Reset file states so we don't re-upload on subsequent saves
      setAvatarFile(null);
      setBannerFile(null);

    } catch (error) {
      alert('خطا در بروزرسانی پروفایل.');
      console.error(error);
    }
  };

  const onLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutVendor();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      alert('خروج از حساب با خطا مواجه شد.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">در حال بارگذاری...</div>;

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">تنظیمات فروشگاه</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Media Uploads Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
            <UploadCloud size={20} className="text-blue-600" />
            تصاویر فروشگاه
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">لوگو / آواتار</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => e.target.files && setAvatarFile(e.target.files[0])}
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:me-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
              />
              {avatarFile && <span className="text-xs text-green-600 mt-2 block">فایل انتخاب شد: {avatarFile.name}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">بنر فروشگاه</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => e.target.files && setBannerFile(e.target.files[0])}
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:me-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
              />
              {bannerFile && <span className="text-xs text-green-600 mt-2 block">فایل انتخاب شد: {bannerFile.name}</span>}
            </div>
          </div>
        </div>

        {/* Basic Info Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
            <Store size={20} className="text-blue-600" />
            اطلاعات پایه
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام فروشگاه</label>
              <input {...register('store_name')} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شماره تماس پشتیبانی</label>
              <input dir="ltr" {...register('phone')} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-start" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <MapPin size={16} className="text-gray-400 dark:text-gray-500" />
              آدرس کامل
            </label>
            <textarea {...register('address')} rows={3} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
          </div>
        </div>

        {/* Business Location Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
            <MapPin size={20} className="text-blue-600" />
            موقعیت کسب و کار
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">محدوده سرویس</label>
            <select
              {...register('service_area_id')}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-start"
            >
              <option value="">انتخاب محدوده سرویس</option>
              {serviceAreaOptions.map((location) => (
                <option key={location.id} value={String(location.id)}>
                  {location.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              برای حذف محدوده سرویس، گزینه انتخاب محدوده سرویس را انتخاب کنید.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
              <input
                dir="ltr"
                inputMode="decimal"
                placeholder="35.6892"
                {...register('latitude')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-start"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
              <input
                dir="ltr"
                inputMode="decimal"
                placeholder="51.3890"
                {...register('longitude')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-start"
              />
            </div>
          </div>
        </div>

        {/* Social Links Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
            <LinkIcon size={20} className="text-blue-600" />
            شبکه‌های اجتماعی
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">لینک اینستاگرام</label>
              <input dir="ltr" placeholder="https://instagram.com/..." {...register('social.instagram')} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-start" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">لینک واتساپ</label>
              <input dir="ltr" placeholder="https://wa.me/..." {...register('social.whatsapp')} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-start" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">لینک تلگرام</label>
              <input dir="ltr" placeholder="https://t.me/..." {...register('social.telegram')} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-start" />
            </div>
          </div>
        </div>

        {/* Submit & Logout Actions */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 fixed bottom-16 inset-x-0 md:static md:bg-transparent md:border-0 md:p-0 z-40">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="w-full md:w-auto md:px-6 py-3.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-300 font-bold rounded-xl disabled:opacity-70 transition-colors flex justify-center items-center gap-2"
            >
              <LogOut size={18} />
              {isLoggingOut ? 'در حال خروج...' : 'خروج از حساب'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto md:px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-70 transition-colors flex justify-center items-center"
            >
              {isSubmitting ? 'در حال ذخیره اطلاعات...' : 'ذخیره تغییرات فروشگاه'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}