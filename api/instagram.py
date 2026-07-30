from http.server import BaseHTTPRequestHandler
import json
import os
import tempfile
import urllib.request
import traceback
from instagrapi import Client

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode('utf-8'))
            
            username = body.get("username")
            password = body.get("password")
            image_url = body.get("image_url")
            caption = body.get("caption", "AI Virtual Try-On #fashion #ai #virtualtryon")
            
            if not username or not password or not image_url:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing username, password, or image_url"}).encode('utf-8'))
                return

            # Download image to temp file
            ext = ".jpg" if ".jpg" in image_url.lower() or ".jpeg" in image_url.lower() else ".png"
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    tmp.write(response.read())
                temp_path = tmp.name

            # Post to Instagram
            cl = Client()
            try:
                # To prevent constant ban issues, you can implement proxy settings here if needed
                cl.login(username, password)
                media = cl.photo_upload(temp_path, caption)
                media_url = f"https://instagram.com/p/{media.code}/"
            except Exception as e:
                raise e
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "post_url": media_url
            }).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": str(e),
                "trace": traceback.format_exc()
            }).encode('utf-8'))
