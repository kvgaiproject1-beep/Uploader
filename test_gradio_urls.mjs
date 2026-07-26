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
  await test("https://huggingface.co/spaces/sharjilsharma/virtual-try-on-test")
  await test("https://sharjilsharma-virtual-try-on-test.hf.space")
  await test("sharjilsharma/virtual-try-on-test ")
  await test(" sharjilsharma/virtual-try-on-test")
  await test("https://sharjilsharma/virtual-try-on-test")
}
run()
