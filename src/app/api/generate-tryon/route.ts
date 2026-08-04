import { NextResponse } from 'next/server';

export const maxDuration = 300; // Vercel Pro/fluid allows up to 300s

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    let modalUrl = process.env.MODAL_API_URL;
    // Hardcode fallback because Vercel is caching or dropping the env variable
    if (!modalUrl || modalUrl.includes('kvgaiproject1--idm-vton-virtual-try-on.modal.run')) {
      modalUrl = 'https://kvgaiproject1--idm-vton-virtual-try-on-web-app.modal.run';
    }

    // Extract files from formData
    const personImageFile = formData.get('human_image') as Blob | null;
    const garmentImageFile = formData.get('garment_image') as Blob | null;

    if (!personImageFile || !garmentImageFile) {
      return new NextResponse('Missing human_image or garment_image', { status: 400 });
    }

    // Extract optional IDM-VTON fields
    const garmentDesc = (formData.get('garment_desc') as string | null) ?? undefined;
    const clothType = (formData.get('cloth_type') as string | null) ?? undefined;

    // Convert to Base64
    const personBuffer = await personImageFile.arrayBuffer();
    const garmentBuffer = await garmentImageFile.arrayBuffer();
    
    const humanImage = Buffer.from(personBuffer).toString('base64');
    const clothImage = Buffer.from(garmentBuffer).toString('base64');

    // 1. Submit the job to IDM-VTON Modal endpoint
    const submitUrl = `${modalUrl.replace(/\/$/, '')}/Submit`;
    const submitPayload: Record<string, unknown> = { humanImage, clothImage };
    if (garmentDesc) submitPayload.garmentDesc = garmentDesc;
    if (clothType) submitPayload.clothType = clothType;

    const submitRes = await fetch(submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitPayload),
    });

    if (!submitRes.ok) {
      const errorText = await submitRes.text();
      return new NextResponse(`Modal Submit Error: ${errorText}`, { status: submitRes.status });
    }

    const submitData = await submitRes.json();
    if (submitData?.result?.status === 'error') {
      return new NextResponse(`Modal Submit Error: ${submitData.result.result}`, { status: 500 });
    }

    const taskId = submitData?.result?.result;
    if (!taskId) {
      return new NextResponse(`Invalid response from Modal: ${JSON.stringify(submitData)}`, { status: 500 });
    }

    // 2. Poll for the result
    const queryUrl = `${modalUrl.replace(/\/$/, '')}/Query?taskId=${taskId}`;
    let base64Result = '';
    
    // Poll for up to ~4.5 minutes (maxDuration is 300s)
    const maxRetries = 90;
    const retryDelay = 3000;
    
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(r => setTimeout(r, retryDelay));
      
      const qRes = await fetch(queryUrl);
      if (!qRes.ok) continue; // ignore intermittent http errors and keep polling
      
      const qData = await qRes.json();
      
      if (qData?.result?.status === 'success') {
        base64Result = qData.result.result;
        break;
      }
      // If it's still generating, it might return status: 'error' with 'pending' message, 
      // or status: 'pending'. We just keep polling unless we hit max retries.
    }

    if (!base64Result) {
      return new NextResponse('Modal processing timed out', { status: 504 });
    }

    // 3. Convert Base64 back to binary blob and return it
    const binaryData = Buffer.from(base64Result, 'base64');
    
    return new NextResponse(binaryData, {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
    });
  } catch (error: any) {
    console.error('Modal API Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
