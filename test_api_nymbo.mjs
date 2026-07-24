import { Client, handle_file } from '@gradio/client';

async function run() {
  console.log("Connecting to Nymbo/Virtual-Try-On...");
  const client = await Client.connect("Nymbo/Virtual-Try-On");
  
  const testImageUrl = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png";
  
  console.log("Running predict...");
  try {
    const result = await client.predict("/tryon", [
      { background: handle_file(testImageUrl), layers: [], composite: null },
      handle_file(testImageUrl),
      "test description",
      true,
      true,
      30,
      42
    ]);
    console.log("Result received!");
  } catch (err) {
    console.error("Error from client:", err);
  }
}

run();
