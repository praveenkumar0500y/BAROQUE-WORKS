import os
import time
from playwright.sync_api import sync_playwright
from PIL import Image

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "images"))
os.makedirs(OUT_DIR, exist_ok=True)

def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Standard desktop viewport 1280x800
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        print("Navigating to http://localhost:5173...")
        page.goto("http://localhost:5173", wait_until="networkidle")
        time.sleep(2)

        # 1. Route & Map
        print("Capturing 01_route_map.png...")
        page.screenshot(path=os.path.join(OUT_DIR, "01_route_map.png"))

        # 2. Riders & Bikes
        print("Switching to Riders & Bikes...")
        page.click("button:has-text('2. Riders & Bikes')")
        time.sleep(1)
        page.screenshot(path=os.path.join(OUT_DIR, "02_riders_specs.png"))

        # 3. Approvals
        print("Switching to Approvals...")
        page.click("button:has-text('3. Approvals')")
        time.sleep(1)
        page.screenshot(path=os.path.join(OUT_DIR, "03_approvals_gate.png"))

        # 4. Action Log
        print("Switching to Action Log...")
        page.click("button:has-text('4. Action Log')")
        time.sleep(1)
        page.screenshot(path=os.path.join(OUT_DIR, "04_action_log.png"))

        # 5. Expenses & UPI
        print("Switching to Expenses & UPI...")
        page.click("button:has-text('5. Expenses & UPI')")
        time.sleep(1)
        page.screenshot(path=os.path.join(OUT_DIR, "05_expenses_upi.png"))

        # Now let's capture frames for demo_walkthrough.gif
        print("Capturing walkthrough frames for GIF...")
        frames = []

        # Sequence of tabs to show full flow
        tabs_sequence = [
            ("button:has-text('1. Route & Map')", 2),
            ("button:has-text('2. Riders & Bikes')", 2),
            ("button:has-text('3. Approvals')", 2),
            ("button:has-text('4. Action Log')", 2),
            ("button:has-text('5. Expenses & UPI')", 2),
            ("button:has-text('6. Cockpit')", 2),
            ("button:has-text('1. Route & Map')", 2),
        ]

        for sel, pause in tabs_sequence:
            page.click(sel)
            time.sleep(1)
            # Take screenshot in memory
            img_bytes = page.screenshot()
            import io
            im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            # Resize slightly to keep GIF size reasonable (e.g. 960x600)
            im_resized = im.resize((960, 600), Image.Resampling.LANCZOS)
            # Add multiple times to give pause in GIF
            for _ in range(int(pause * 2)):
                frames.append(im_resized)

        if frames:
            gif_path = os.path.join(OUT_DIR, "demo_walkthrough.gif")
            print(f"Saving GIF to {gif_path} ({len(frames)} frames)...")
            frames[0].save(
                gif_path,
                save_all=True,
                append_images=frames[1:],
                duration=500, # 500ms per frame
                loop=0,
                optimize=True
            )
            print("GIF saved successfully!")

        browser.close()
        print("Done capturing screenshots and demo GIF!")

if __name__ == "__main__":
    capture()
