'use client';

// This file is deprecated - use /shared/[sopId]/page.tsx instead
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function SharedSOPRedirectPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the correct route
    router.replace(`/shared/${id}`);
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      <p className="ml-4">Redirecting...</p>
    </div>
  );
} 