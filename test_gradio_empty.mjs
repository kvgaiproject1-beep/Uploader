import { Client } from '@gradio/client'

async function test(spaceId) {
  try {
    const client = await Client.connect(spaceId)
    console.log(`Success for: "${spaceId}"`)
  } catch (e) {
    console.error(`Error for "${spaceId}":`, e.message)
  }
}

async function run() {
  await test(" ")
  await test("")
  await test(null)
}
run()
