import { Client, handle_file } from '@gradio/client';

async function run() {
  console.log("Connecting to sharjilsharma/virtual-try-on-test...");
  const client = await Client.connect("sharjilsharma/virtual-try-on-test");
  
  const humanUrl = "https://raw.githubusercontent.com/yisol/IDM-VTON/main/example/person/00008_00.jpg";
  const garmentUrl = "https://raw.githubusercontent.com/yisol/IDM-VTON/main/example/garment/00044_00.jpg";
  
  console.log("Running predict with just handle_file...");
  try {
    const result = await client.predict("/tryon", [
      handle_file(humanUrl), // Try passing just the file instead of the dict
      handle_file(garmentUrl),
      "test description",
      true,
      true,
      30,
      42,
      false,
      ""
    ]);
    console.log("Result received!");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error from client (just file):", err);
  }

  console.log("Running predict with full dict...");
  try {
    const result2 = await client.predict("/tryon", [
      { background: handle_file(humanUrl), layers: [], composite: null },
      handle_file(garmentUrl),
      "test description",
      true,
      true,
      30,
      42,
      false,
      ""
    ]);
    console.log("Result received!");
    console.log(JSON.stringify(result2, null, 2));
  } catch (err) {
    console.error("Error from client (dict):", err);
  }
}

run();
