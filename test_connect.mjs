import { Client } from '@gradio/client';

async function run() {
  try {
    const client = await Client.connect("sharjilsharma/virtual-try-on-test", {
      token: undefined
    });
    console.log("Connected successfully");
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
