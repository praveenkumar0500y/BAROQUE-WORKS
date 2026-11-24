import os
import time
from playwright.sync_api import sync_playwright
from PIL import Image

def capture_all():
    docs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "images")
    os.makedirs(docs_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        # High-res 1440x900 viewport with 2x retina scale
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2
        )
        page = context.new_page()

        print("Navigating to http://localhost:5173 ...")
        page.goto("http://localhost:5173")
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        screens = [
            ("00_command_center.png", "Command Center", 2),
            ("01_route_map.png", "Route & Stops", 3),
            ("02_riders_specs.png", "Riders & Bikes", 2),
            ("03_approvals_gate.png", "Approvals Gate", 2),
            ("04_action_log.png", "Action Audit Log", 2),
            ("05_expenses_upi.png", "Expenses & UPI", 2),
            ("06_cockpit_hud.png", "Cockpit Mode", 2),
        ]

        captured_paths = []

        for filename, nav_text, wait_sec in screens:
            print(f"Capturing {nav_text} -> {filename} ...")
            # Click sidebar nav item
            btn = page.locator(f"button:has-text('{nav_text}')").first
            if btn.is_visible():
                btn.click()
            else:
                print(f"Warning: button for {nav_text} not found directly, trying selector")
                page.click(f"text={nav_text}")

            time.sleep(wait_sec)
            
            # If on route map, ensure map tiles have a moment to render
            if "Route" in nav_text:
                time.sleep(1)

            out_path = os.path.join(docs_dir, filename)
            page.screenshot(path=out_path, full_page=False)
            captured_paths.append(out_path)
            print(f"Saved: {out_path} ({os.path.getsize(out_path)} bytes)")

        # Create demo walkthrough GIF
        print("Creating demo_walkthrough.gif ...")
        gif_frames = []
        for path in captured_paths:
            img = Image.open(path)
            # Resize image to reasonable GIF dimensions (1152 x 720) for github performance
            resized = img.resize((1152, 720), Image.Resampling.LANCZOS).convert("RGB")
            # Quantize with palette
            quantized = resized.quantize(colors=256, method=Image.Resampling.LANCZOS)
            gif_frames.append(quantized)

        gif_path = os.path.join(docs_dir, "demo_walkthrough.gif")
        if gif_frames:
            gif_frames[0].save(
                gif_path,
                save_all=True,
                append_images=gif_frames[1:],
                duration=1800,  # 1.8 seconds per slide
                loop=0,
                optimize=True
            )
            print(f"Saved walkthrough GIF: {gif_path} ({os.path.getsize(gif_path)} bytes)")

        browser.close()
        print("All screenshots and GIF captured successfully!")

if __name__ == "__main__":
    capture_all()
