import { Client } from '@gradio/client';
async function run() {
  try {
    const client = await Client.connect("https://huggingface.co/spaces/sharjilsharma/virtual-try-on-test", { token: undefined });
    console.log("Success with full URL");
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
