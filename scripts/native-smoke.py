"""Exercise the real APK on CI's isolated emulator without creating accounts."""
import re
import subprocess
import time
import xml.etree.ElementTree as ET


def adb(*args):
    return subprocess.run(["adb", *args], check=True, capture_output=True).stdout


def snapshot(name="native-current"):
    adb("shell", "uiautomator", "dump", "/sdcard/just1date-ui.xml")
    data = adb("shell", "cat", "/sdcard/just1date-ui.xml")
    with open(name + ".xml", "wb") as output:
        output.write(data)
    return ET.fromstring(data)


def expect_text(text):
    for _ in range(8):
        root = snapshot()
        if any(text in n.attrib.get("text", "") + n.attrib.get("content-desc", "")
               for n in root.iter("node")):
            return root
        time.sleep(1)
    raise AssertionError("Native screen did not show: " + text)


def tap(label):
    root = snapshot()
    candidates = [n for n in root.iter("node")
                  if label in (n.attrib.get("text"), n.attrib.get("content-desc"))]
    assert candidates, "Native control is missing: " + label
    for node in candidates:
        bounds = [int(x) for x in re.findall(r"\d+", node.attrib.get("bounds", ""))]
        if len(bounds) == 4 and bounds[2] > bounds[0] and bounds[3] > bounds[1]:
            adb("shell", "input", "tap", str((bounds[0] + bounds[2]) // 2),
                str((bounds[1] + bounds[3]) // 2))
            return
    raise AssertionError("Native control is outside the visible screen: " + label)


def capture(name):
    snapshot(name)
    with open(name + ".png", "wb") as image:
        image.write(adb("exec-out", "screencap", "-p"))


expect_text("Create an account")
capture("android-welcome")
tap("Create an account")
expect_text("Sign up to continue")
capture("android-signup")
tap("Continue with email")
root = expect_text("Let’s begin.")
assert len([n for n in root.iter("node")
            if n.attrib.get("class") == "android.widget.EditText"]) >= 2
tap("Create account")
expect_text("Enter a valid email address")
capture("android-registration-validation")
adb("shell", "input", "keyevent", "4")
expect_text("Sign up to continue")
tap("Use phone number")
expect_text("My mobile")
tap("Continue")
expect_text("Enter your phone number with its country code")
capture("android-phone-validation")
adb("shell", "input", "keyevent", "4")
expect_text("Sign up to continue")
tap("Back to welcome")
expect_text("Create an account")
print("Native welcome, signup navigation, registration and phone validation passed; no account or SMS was created.")
