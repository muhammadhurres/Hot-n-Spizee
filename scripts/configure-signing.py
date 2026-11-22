import os
import re
import sys
import base64

def get_secret(name):
    return (os.environ.get(name) or "").strip()

def extract_clean_value(raw):
    if not raw:
        return ""
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    for line in lines:
        if "Secret Value:" in line:
            return line.split("Secret Value:", 1)[1].strip()
    return lines[-1].split(":", 1)[-1].strip()

def extract_base64(raw):
    if not raw:
        return None
    cleaned = re.sub(r'[\r\n\s]', '', raw)
    if "SecretValue:" in cleaned:
        cleaned = cleaned.split("SecretValue:", 1)[1]
    matches = re.findall(r'[A-Za-z0-9+/]{50,}={0,2}', cleaned)
    if matches:
        candidate = max(matches, key=len)
        try:
            return base64.b64decode(candidate)
        except Exception as e:
            print(f"Error decoding matched base64: {e}")
    try:
        return base64.b64decode(cleaned)
    except Exception as e:
        print(f"Error direct decoding base64: {e}")
        return None

def main():
    b64_raw = get_secret("ANDROID_KEYSTORE_BASE64")
    store_pass_raw = get_secret("ANDROID_KEYSTORE_PASSWORD")
    alias_raw = get_secret("ANDROID_KEY_ALIAS")
    key_pass_raw = get_secret("ANDROID_KEY_PASSWORD")

    github_output = os.environ.get("GITHUB_OUTPUT")
    github_env = os.environ.get("GITHUB_ENV")

    if not (b64_raw and store_pass_raw and alias_raw and key_pass_raw):
        print("Release signing secrets are missing or incomplete.")
        if github_output:
            with open(github_output, "a", encoding="utf-8") as f:
                f.write("configured=false\n")
        return

    keystore_bytes = extract_base64(b64_raw)
    if not keystore_bytes:
        print("Failed to decode base64 keystore from ANDROID_KEYSTORE_BASE64.")
        if github_output:
            with open(github_output, "a", encoding="utf-8") as f:
                f.write("configured=false\n")
        return

    os.makedirs("android/app", exist_ok=True)
    with open("android/app/release.keystore", "wb") as f:
        f.write(keystore_bytes)
    print(f"Wrote release.keystore ({len(keystore_bytes)} bytes)")

    clean_alias = extract_clean_value(alias_raw) or "hotnspizee"
    clean_store_pass = extract_clean_value(store_pass_raw)
    clean_key_pass = extract_clean_value(key_pass_raw)

    if github_env:
        with open(github_env, "a", encoding="utf-8") as f:
            f.write(f"ANDROID_KEY_ALIAS={clean_alias}\n")
            f.write(f"ANDROID_KEYSTORE_PASSWORD={clean_store_pass}\n")
            f.write(f"ANDROID_KEY_PASSWORD={clean_key_pass}\n")

    if github_output:
        with open(github_output, "a", encoding="utf-8") as f:
            f.write("configured=true\n")
    print("Release signing successfully configured!")

if __name__ == "__main__":
    main()
