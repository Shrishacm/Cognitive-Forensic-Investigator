"""
registry_parser.py
==================
Parses Windows Registry hive files found inside forensic disk images.

Supported hives:
  NTUSER.DAT  — Recent docs, typed URLs, run history, searches, typed paths
  SOFTWARE    — Installed programs, OS info, network profiles
  SYSTEM      — USB device history, computer name, timezone, network interfaces
  SAM         — (structure only; accounts require offline SAM cracking)
  SECURITY    — Auditing and policy info
  USRCLASS    — Shell bag / user extension data

Requires: python-registry (pip install python-registry)
"""

import os
from datetime import datetime

try:
    from Registry import Registry
    REGISTRY_AVAILABLE = True
except ImportError:
    REGISTRY_AVAILABLE = False
    print(
        "WARNING: python-registry not installed. "
        "Registry parsing disabled. Install with: pip install python-registry"
    )

# ── Hive filename → type label ───────────────────────────────────────────────

REGISTRY_HIVES = {
    "ntuser.dat":   "NTUSER",
    "software":     "SOFTWARE",
    "system":       "SYSTEM",
    "sam":          "SAM",
    "security":     "SECURITY",
    "usrclass.dat": "USRCLASS",
}


def is_registry_hive(filename: str) -> bool:
    """Returns True if the filename matches a known Windows registry hive."""
    return filename.lower() in REGISTRY_HIVES


# ── Internal helpers ─────────────────────────────────────────────────────────

def _safe_reg_read(key, value_name, default=""):
    """Safely reads a registry value, returning default on any error."""
    try:
        return key.value(value_name).value()
    except Exception:
        return default


def _format_timestamp(reg_ts) -> str:
    """Converts a registry timestamp to ISO 8601 string."""
    try:
        if hasattr(reg_ts, "isoformat"):
            return reg_ts.isoformat()
        return str(reg_ts)
    except Exception:
        return "Unknown"


# ── NTUSER.DAT ───────────────────────────────────────────────────────────────

def parse_ntuser(hive_path: str) -> dict:
    """
    Parses NTUSER.DAT hive.
    Extracts: recent documents, typed URLs (IE/Edge), Run dialog history,
    Windows Search queries, Explorer typed paths, wallpaper.
    """
    if not REGISTRY_AVAILABLE:
        return {}

    results = {
        "hive_type": "NTUSER",
        "recent_docs": [],
        "typed_urls": [],
        "run_history": [],
        "recent_searches": [],
        "typed_paths": [],
        "shell_bag_paths": [],
        "user_info": {},
        "wallpaper": None,
    }

    try:
        reg = Registry.Registry(hive_path)

        # ── Recent Documents ──────────────────────────────────────────────
        try:
            key = reg.open(
                r"Software\Microsoft\Windows\CurrentVersion\Explorer\RecentDocs"
            )
            for val in key.values():
                try:
                    name = val.name()
                    if name and not name.isdigit() and name != "MRUListEx":
                        results["recent_docs"].append(name)
                except Exception:
                    pass
        except Exception:
            pass

        # ── Typed URLs (Internet Explorer / Edge legacy) ──────────────────
        try:
            key = reg.open(
                r"Software\Microsoft\Internet Explorer\TypedURLs"
            )
            for val in key.values():
                try:
                    results["typed_urls"].append({
                        "url": str(val.value()),
                        "name": val.name(),
                    })
                except Exception:
                    pass
        except Exception:
            pass

        # ── Run MRU (Win+R dialog history) ───────────────────────────────
        try:
            key = reg.open(
                r"Software\Microsoft\Windows\CurrentVersion\Explorer\RunMRU"
            )
            for val in key.values():
                if val.name() not in ("MRUList",):
                    try:
                        results["run_history"].append(str(val.value()))
                    except Exception:
                        pass
        except Exception:
            pass

        # ── Explorer Typed Paths ──────────────────────────────────────────
        try:
            key = reg.open(
                r"Software\Microsoft\Windows\CurrentVersion\Explorer\TypedPaths"
            )
            for val in key.values():
                try:
                    results["typed_paths"].append(str(val.value()))
                except Exception:
                    pass
        except Exception:
            pass

        # ── Windows Search (WordWheelQuery) ───────────────────────────────
        try:
            key = reg.open(
                r"Software\Microsoft\Windows\CurrentVersion\Explorer\WordWheelQuery"
            )
            for val in key.values():
                if val.name() not in ("MRUListEx",):
                    try:
                        v = val.value()
                        if isinstance(v, bytes):
                            v = v.decode("utf-16-le", errors="ignore").rstrip("\x00")
                        if v and len(str(v).strip()) > 1:
                            results["recent_searches"].append(str(v).strip())
                    except Exception:
                        pass
        except Exception:
            pass

        # ── Desktop Wallpaper (user context clue) ─────────────────────────
        try:
            key = reg.open(r"Control Panel\Desktop")
            wp = _safe_reg_read(key, "Wallpaper")
            if wp:
                results["wallpaper"] = wp
        except Exception:
            pass

        # ── ShellBags (folder access history) ─────────────────────────────
        for shell_bag_path in [
            r"Software\Microsoft\Windows\Shell\BagMRU",
            r"Software\Microsoft\Windows\ShellNoRoam\BagMRU",
        ]:
            try:
                key = reg.open(shell_bag_path)
                for val in key.values():
                    try:
                        results["shell_bag_paths"].append(
                            f"BagMRU entry: {val.name()}"
                        )
                    except Exception:
                        pass
            except Exception:
                pass

        # ── User account info ─────────────────────────────────────────────
        try:
            key = reg.open(r"Software\Microsoft\Windows\CurrentVersion\Explorer")
            results["user_info"] = {
                "logon_user_name": _safe_reg_read(key, "Logon User Name"),
            }
        except Exception:
            pass

    except Exception as e:
        results["parse_error"] = str(e)

    return results


# ── SOFTWARE ─────────────────────────────────────────────────────────────────

def parse_software(hive_path: str) -> dict:
    """
    Parses the SOFTWARE hive.
    Extracts: installed programs, OS info, registered owner,
    network profiles, recent Wi-Fi SSIDs.
    """
    if not REGISTRY_AVAILABLE:
        return {}

    results = {
        "hive_type": "SOFTWARE",
        "installed_programs": [],
        "os_info": {},
        "registered_owner": None,
        "registered_org": None,
        "network_profiles": [],
        "recent_wifi": [],
    }

    try:
        reg = Registry.Registry(hive_path)

        # ── OS Information ─────────────────────────────────────────────────
        try:
            key = reg.open(r"Microsoft\Windows NT\CurrentVersion")
            results["os_info"] = {
                "product_name":    _safe_reg_read(key, "ProductName"),
                "display_version": _safe_reg_read(key, "DisplayVersion"),
                "current_build":   _safe_reg_read(key, "CurrentBuild"),
                "install_date":    _safe_reg_read(key, "InstallDate"),
                "edition":         _safe_reg_read(key, "EditionID"),
            }
            results["registered_owner"] = _safe_reg_read(key, "RegisteredOwner")
            results["registered_org"]   = _safe_reg_read(key, "RegisteredOrganization")
        except Exception:
            pass

        # ── Installed Programs (32-bit and 64-bit) ─────────────────────────
        for uninstall_path in [
            r"Microsoft\Windows\CurrentVersion\Uninstall",
            r"Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
        ]:
            try:
                key = reg.open(uninstall_path)
                for subkey in key.subkeys():
                    try:
                        name    = _safe_reg_read(subkey, "DisplayName")
                        version = _safe_reg_read(subkey, "DisplayVersion")
                        pub     = _safe_reg_read(subkey, "Publisher")
                        if name:
                            results["installed_programs"].append({
                                "name":      name,
                                "version":   version,
                                "publisher": pub,
                            })
                    except Exception:
                        pass
            except Exception:
                pass

        # Deduplicate programs by name
        seen_names: set = set()
        deduped = []
        for prog in results["installed_programs"]:
            if prog["name"] not in seen_names:
                seen_names.add(prog["name"])
                deduped.append(prog)
        results["installed_programs"] = deduped

        # ── Network Profiles ───────────────────────────────────────────────
        try:
            key = reg.open(
                r"Microsoft\Windows NT\CurrentVersion\NetworkList\Profiles"
            )
            for subkey in key.subkeys():
                try:
                    results["network_profiles"].append({
                        "name":     _safe_reg_read(subkey, "ProfileName"),
                        "category": _safe_reg_read(subkey, "Category"),
                        "type":     _safe_reg_read(subkey, "NameType"),
                    })
                except Exception:
                    pass
        except Exception:
            pass

        # ── Wi-Fi SSIDs ────────────────────────────────────────────────────
        try:
            key = reg.open(
                r"Microsoft\Windows NT\CurrentVersion\NetworkList\Signatures\Managed"
            )
            for subkey in key.subkeys():
                try:
                    ssid = _safe_reg_read(subkey, "FirstNetwork")
                    if ssid:
                        results["recent_wifi"].append(ssid)
                except Exception:
                    pass
        except Exception:
            pass
        try:
            key = reg.open(
                r"Microsoft\Windows NT\CurrentVersion\NetworkList\Signatures\Unmanaged"
            )
            for subkey in key.subkeys():
                try:
                    ssid = _safe_reg_read(subkey, "FirstNetwork")
                    if ssid:
                        results["recent_wifi"].append(ssid)
                except Exception:
                    pass
        except Exception:
            pass

    except Exception as e:
        results["parse_error"] = str(e)

    return results


# ── SYSTEM ───────────────────────────────────────────────────────────────────

def parse_system(hive_path: str) -> dict:
    """
    Parses the SYSTEM hive.
    Extracts: USB device connection history, computer name, timezone,
    network interfaces, and registered services.
    """
    if not REGISTRY_AVAILABLE:
        return {}

    results = {
        "hive_type": "SYSTEM",
        "computer_name": None,
        "timezone": None,
        "usb_devices": [],
        "network_interfaces": [],
        "services": [],
    }

    try:
        reg = Registry.Registry(hive_path)

        # ── Detect current control set ─────────────────────────────────────
        try:
            key = reg.open("Select")
            current = _safe_reg_read(key, "Current", 1)
            ccs = f"ControlSet{str(current).zfill(3)}"
        except Exception:
            ccs = "ControlSet001"

        # ── Computer Name ──────────────────────────────────────────────────
        try:
            key = reg.open(f"{ccs}\\Control\\ComputerName\\ComputerName")
            results["computer_name"] = _safe_reg_read(key, "ComputerName")
        except Exception:
            pass

        # ── Timezone ───────────────────────────────────────────────────────
        try:
            key = reg.open(f"{ccs}\\Control\\TimeZoneInformation")
            results["timezone"] = _safe_reg_read(key, "TimeZoneKeyName")
        except Exception:
            pass

        # ── USB Storage Device History ─────────────────────────────────────
        try:
            key = reg.open(f"{ccs}\\Enum\\USBSTOR")
            for device_class in key.subkeys():
                for device in device_class.subkeys():
                    try:
                        friendly_name = ""
                        last_arrival  = ""
                        for instance in device.subkeys():
                            fn = _safe_reg_read(instance, "FriendlyName")
                            if fn:
                                friendly_name = fn
                            # Timestamps live in sub-key "Properties\..."
                            try:
                                props = instance.subkey(
                                    "Properties\\{83da6326-97a6-4088-9453-a1923f573b29}"
                                )
                                for prop in props.subkeys():
                                    try:
                                        ts_val = prop.value("Data").value()
                                        last_arrival = str(ts_val)
                                    except Exception:
                                        pass
                            except Exception:
                                pass
                        results["usb_devices"].append({
                            "device_class":  device_class.name(),
                            "serial":        device.name(),
                            "friendly_name": friendly_name,
                            "last_arrival":  last_arrival,
                        })
                    except Exception:
                        pass
        except Exception:
            pass

        # ── Network Interfaces ─────────────────────────────────────────────
        try:
            key = reg.open(
                f"{ccs}\\Services\\Tcpip\\Parameters\\Interfaces"
            )
            for iface in key.subkeys():
                try:
                    ip      = _safe_reg_read(iface, "IPAddress")
                    dhcp_ip = _safe_reg_read(iface, "DhcpIPAddress")
                    if ip or dhcp_ip:
                        results["network_interfaces"].append({
                            "guid":       iface.name(),
                            "static_ip":  ip,
                            "dhcp_ip":    dhcp_ip,
                            "subnet":     _safe_reg_read(iface, "SubnetMask"),
                            "gateway":    _safe_reg_read(iface, "DefaultGateway"),
                        })
                except Exception:
                    pass
        except Exception:
            pass

        # ── Services (top-level names only, avoid noise) ───────────────────
        try:
            key = reg.open(f"{ccs}\\Services")
            for svc in key.subkeys():
                try:
                    display = _safe_reg_read(svc, "DisplayName")
                    svc_type = _safe_reg_read(svc, "Type", 0)
                    start    = _safe_reg_read(svc, "Start", -1)
                    # Only include services with DisplayName and type > 0
                    if display and svc_type:
                        results["services"].append({
                            "name":    svc.name(),
                            "display": display,
                            "start":   start,
                        })
                except Exception:
                    pass
        except Exception:
            pass

    except Exception as e:
        results["parse_error"] = str(e)

    return results


# ── Main Entry Point ─────────────────────────────────────────────────────────

def parse_registry_hive(
    data: bytes,
    filename: str,
    temp_dir: str,
) -> tuple:
    """
    Main entry point called by media_extractor.
    Detects hive type by filename, parses it, and returns
    (text_summary: str, extraction_type: str).
    The text summary is then chunked and embedded like any other evidence.
    """
    if not REGISTRY_AVAILABLE:
        return (
            f"[Registry hive: {filename.upper()}. "
            f"python-registry not installed. "
            f"Install: pip install python-registry]",
            "registry",
        )

    hive_key = filename.lower()
    tmp_path  = os.path.join(temp_dir, f"reg_tmp_{filename}")

    try:
        # Write bytes to a temp file (Registry library requires a file path)
        with open(tmp_path, "wb") as f:
            f.write(data)

        hive_label = REGISTRY_HIVES.get(hive_key, hive_key.upper())
        text_parts = [
            f"[Windows Registry Hive: {hive_label}]",
            f"Source file: {filename}",
            "",
        ]

        # Dispatch to the appropriate parser
        if "ntuser" in hive_key:
            parsed = parse_ntuser(tmp_path)
        elif "software" in hive_key:
            parsed = parse_software(tmp_path)
        elif "system" in hive_key:
            parsed = parse_system(tmp_path)
        else:
            # Generic — just report root key name
            try:
                reg = Registry.Registry(tmp_path)
                root_name = reg.root().name()
                text_parts.append(f"Registry root key: {root_name}")
                text_parts.append("(Detailed parsing not yet implemented for this hive type)")
            except Exception as gen_e:
                text_parts.append(f"Could not parse hive: {gen_e}")
            parsed = {}

        # ── Format parsed data as human-readable text ─────────────────────
        for key, value in parsed.items():
            if key in ("hive_type",):
                continue
            if key == "parse_error":
                text_parts.append(f"\nParse warning: {value}")
                continue

            section_title = key.replace("_", " ").title()

            if isinstance(value, list) and value:
                text_parts.append(f"\n{section_title} ({len(value)}):")
                for item in value[:60]:  # cap at 60 items
                    if isinstance(item, dict):
                        line = "  " + " | ".join(
                            f"{k}: {v}" for k, v in item.items() if v
                        )
                        text_parts.append(line)
                    else:
                        text_parts.append(f"  {item}")

            elif isinstance(value, dict) and value:
                text_parts.append(f"\n{section_title}:")
                for k, v in value.items():
                    if v:
                        text_parts.append(f"  {k}: {v}")

            elif value and not isinstance(value, (dict, list)):
                text_parts.append(f"{section_title}: {value}")

        # Clean up temp file
        try:
            os.remove(tmp_path)
        except Exception:
            pass

        return ("\n".join(text_parts), "registry")

    except Exception as e:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        return (
            f"[Registry parse failed for {filename}: {str(e)[:200]}]",
            "registry",
        )
