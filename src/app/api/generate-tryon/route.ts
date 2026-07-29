import { NextResponse } from 'next/server';

export const maxDuration = 60; // Set Vercel timeout to 60 seconds (Hobby Max)

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // We forward the exact same formData to Modal
    const modalUrl = process.env.MODAL_API_URL;
    const modalKey = process.env.MODAL_API_KEY;

    if (!modalUrl) {
      console.error("Missing MODAL_API_URL environment variable.");
      return new NextResponse("Modal API URL is not configured on the server", { status: 500 });
    }

    const headers: Record<string, string> = {};
    if (modalKey) {
      headers["Authorization"] = `Bearer ${modalKey}`;
    }

    // Call the modal API. Node 18+ natively supports passing FormData to fetch.
    const modalRes = await fetch(modalUrl, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!modalRes.ok) {
      const errorText = await modalRes.text();
      console.error("Modal API Error:", errorText);
      return new NextResponse(`Modal Generation Error: ${errorText}`, { status: modalRes.status });
    }

    // Modal returns the raw image blob
    const blob = await modalRes.blob();
    
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': modalRes.headers.get('Content-Type') || 'image/jpeg',
      }
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
