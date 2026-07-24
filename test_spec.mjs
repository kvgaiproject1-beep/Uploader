import { Client } from '@gradio/client';

async function run() {
  const client = await Client.connect("yisol/IDM-VTON");
  const info = await client.view_api();
  console.log(JSON.stringify(info, null, 2));
}

run();
