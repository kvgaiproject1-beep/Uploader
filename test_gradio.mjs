import { Client } from '@gradio/client'

async function test() {
  try {
    const spaceId = "sharjilsharma/virtual-try-on-test"
    console.log("Connecting to", spaceId)
    const client = await Client.connect(spaceId)
    console.log("Success!")
  } catch (e) {
    console.error("Error connecting:", e.message || e)
  }
}
test()
