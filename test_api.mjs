import { Client, handle_file } from '@gradio/client';

async function run() {
  console.log("Connecting to sharjilsharma/virtual-try-on-test...");
  const client = await Client.connect("sharjilsharma/virtual-try-on-test");
  
  const humanUrl = "https://raw.githubusercontent.com/yisol/IDM-VTON/main/example/person/00008_00.jpg";
  const garmentUrl = "https://raw.githubusercontent.com/yisol/IDM-VTON/main/example/garment/00044_00.jpg";
  
  const res1 = await fetch(humanUrl);
  const blob1 = await res1.blob();
  
  const res2 = await fetch(garmentUrl);
  const blob2 = await res2.blob();

  console.log("Running predict with Blobs directly...");
  try {
    const result = await client.predict("/tryon", [
      { background: blob1, layers: [], composite: null },
      blob2,
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
    console.error("Error from client (blobs direct):", err);
  }
}

run();
