import { Client, handle_file } from '@gradio/client';

async function run() {
  console.log("Connecting to yisol/IDM-VTON...");
  const client = await Client.connect("yisol/IDM-VTON");
  
  const humanUrl = "https://raw.githubusercontent.com/yisol/IDM-VTON/main/example/person/00008_00.jpg";
  const garmentUrl = "https://raw.githubusercontent.com/yisol/IDM-VTON/main/example/garment/00044_00.jpg";
  
  console.log("Running predict...");
  try {
    const result = await client.predict("/tryon", [
      { background: handle_file(humanUrl), layers: [], composite: null },
      handle_file(garmentUrl),
      "test description",
      true,
      true,
      30,
      42
    ]);
    console.log("Result received!");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error from client:", err);
  }
}

run();
