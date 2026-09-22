import os
import urllib.parse
import urllib.request

manifest_file = "manifest.txt"

if not os.path.exists(manifest_file):
    print(f"Error: '{manifest_file}' not found.")
    exit(1)

valid_urls = []
with open(manifest_file, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        clean = line.strip()
        # Keep only actual URLs
        if clean.startswith("http://") or clean.startswith("https://"):
            valid_urls.append(clean)

print(f"Found {len(valid_urls)} actual download URL(s).")

if not valid_urls:
    print("No valid HTTP/HTTPS URLs found in manifest.txt.")
    exit(1)

for idx, url in enumerate(valid_urls, 1):
    parsed = urllib.parse.urlparse(url)
    rel_path = parsed.path.lstrip("/")
    
    # Isolate the amicorpus directory structure
    if "amicorpus" in rel_path:
        rel_path = rel_path[rel_path.find("amicorpus"):]
    else:
        rel_path = os.path.basename(rel_path)

    # Normalize forward slashes to Windows backslashes
    rel_path = os.path.normpath(rel_path)
    folder = os.path.dirname(rel_path)
    
    if folder:
        os.makedirs(folder, exist_ok=True)

    print(f"[{idx}/{len(valid_urls)}] Downloading: {rel_path}")
    try:
        urllib.request.urlretrieve(url, rel_path)
    except Exception as e:
        print(f"Failed to download {url}: {e}")

print("All downloads finished!")