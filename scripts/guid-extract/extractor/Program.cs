using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using AssetsTools.NET;
using AssetsTools.NET.Extra;

namespace GuidExtract
{
    internal static class Program
    {
        private static int Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            if (args.Length < 4)
            {
                Console.Error.WriteLine("Usage: guid-extract <resources.assets> <managedFolder> <classdata.tpk> <out.csv> [--items] [--mods]");
                return 2;
            }
            string assetsPath = args[0];
            string managedFolder = args[1];
            string tpkPath = args[2];
            string outPath = args[3];
            bool doAll = args.Contains("--all");
            bool doSkills = args.Contains("--skills");
            bool doItems = doAll || args.Contains("--items") || (!args.Contains("--items") && !args.Contains("--mods") && !doAll && !doSkills);
            bool doMods = doAll || args.Contains("--mods");

            if (!File.Exists(assetsPath))
            {
                Console.Error.WriteLine($"Assets file not found: {assetsPath}");
                return 2;
            }

            var manager = new AssetsManager();
            manager.UseQuickLookup = true;
            manager.MonoTempGenerator = new MonoCecilTempGenerator(managedFolder);

            if (!File.Exists(tpkPath))
            {
                Console.Error.WriteLine($"Class package not found: {tpkPath}");
                return 2;
            }
            manager.LoadClassPackage(tpkPath);

            var afileInst = manager.LoadAssetsFile(assetsPath, true);
            var afile = afileInst.file;
            Console.WriteLine($"Unity: {afile.Metadata.UnityVersion}, objects: {afile.Metadata.AssetInfos.Count}");
            manager.LoadClassDatabaseFromPackage(afile.Metadata.UnityVersion);

            var results = new Dictionary<string, (string name, string type, string desc)>(StringComparer.OrdinalIgnoreCase);
            int totalMb = 0, matched = 0, errors = 0;
            var allTypeNames = new HashSet<string>(StringComparer.Ordinal);
            var scriptNameCache = new Dictionary<(int, long), string>();
            bool dumpedSkill = false;
            bool dumpedMod = false;

            foreach (var info in afile.Metadata.GetAssetsOfType(AssetClassID.MonoBehaviour))
            {
                totalMb++;
                AssetTypeValueField bf;
                try
                {
                    bf = manager.GetBaseField(afileInst, info);
                }
                catch (Exception ex)
                {
                    errors++;
                    if (errors <= 1)
                        Console.Error.WriteLine($"  err(persist {totalMb}): {ex}");
                    continue;
                }
                if (bf == null || bf.IsDummy) continue;

                string typeName = GetScriptTypeName(manager, afileInst, bf, scriptNameCache);
                if (typeName != null)
                    allTypeNames.Add(typeName);

                bool isItem = doItems && typeName != null && (
                    typeName.EndsWith("ItemInfo", StringComparison.Ordinal) ||
                    typeName == "WeaponInfo" ||
                    typeName == "PickaxeInfo" ||
                    typeName == "FishingPoleInfo" ||
                    typeName == "ArmorInfo" ||
                    typeName == "ShieldInfo" ||
                    typeName == "AccessoryInfo" ||
                    typeName == "ConsumableInfo" ||
                    typeName == "MaterialInfo" ||
                    typeName == "MonsterInfo"
                );
                bool isMod = doMods && typeName != null && string.Equals(typeName, "ItemMod", StringComparison.Ordinal);
                bool isAll = doAll && typeName != null;
                bool isSkill = doSkills && typeName != null && typeName == "SkillInfo";

                if (!isItem && !isMod && !isAll && !isSkill) continue;

                if (isSkill && !dumpedSkill)
                {
                    dumpedSkill = true;
                    Console.Error.WriteLine("=== first SkillInfo fields ===");
                    foreach (var f in bf.Children ?? Enumerable.Empty<AssetTypeValueField>())
                        Console.Error.WriteLine($"   {f.FieldName} (type {f.TypeName})");
                }
                if (isMod && !dumpedMod)
                {
                    dumpedMod = true;
                    Console.Error.WriteLine("=== first ItemMod fields ===");
                    foreach (var f in bf.Children ?? Enumerable.Empty<AssetTypeValueField>())
                        Console.Error.WriteLine($"   {f.FieldName} (type {f.TypeName})");
                }

                try
                {
                    string name = SafeStr(bf, "m_Name");

                    string guid = GuidFromRawAssetBytes(assetsPath, info, afile.Header.DataOffset);
                    if (string.IsNullOrWhiteSpace(guid))
                        guid = GuidFromSerializationData(bf);
                    if (string.IsNullOrWhiteSpace(guid))
                        guid = SafeStr(bf, "Guid");
                    if (string.IsNullOrWhiteSpace(guid)) { errors++; continue; }
                    guid = NormalizeGuid(guid);
                    if (guid != null && !results.ContainsKey(guid))
                    {
                        string desc = "";
                        if (isSkill)
                        {
                            desc = SafeStr(bf, "OptionalDescription") ?? SafeStr(bf, "Description") ?? SafeStr(bf, "Tooltip") ?? "";
                        }
                        else if (isMod)
                        {
                            desc = SafeStr(bf, "Description") ?? "";
                        }
                        results[guid] = (string.IsNullOrWhiteSpace(name) ? "(unnamed)" : name.Trim(), typeName ?? "Unknown", desc);
                        matched++;
                    }
                }
                catch
                {
                    errors++;
                }
            }

            using (var sw = new StreamWriter(outPath, false, new UTF8Encoding(false)))
            {
                sw.WriteLine("Name,GUID,Type,Description");
                foreach (var kv in results.OrderBy(k => k.Value.name, StringComparer.OrdinalIgnoreCase))
                {
                    sw.WriteLine($"{CsvEscape(kv.Value.name)},{kv.Key},{kv.Value.type},{CsvEscape(kv.Value.desc)}");
                }
            }

            Console.WriteLine($"MonoBehaviours: {totalMb}, matched: {matched}, errors: {errors}");
            Console.WriteLine($"All type names ({allTypeNames.Count}):");
            foreach (var t in allTypeNames.OrderBy(x => x)) Console.WriteLine($"   {t}");
            Console.WriteLine($"Wrote {results.Count} unique rows -> {outPath}");
            return 0;
        }

        private static string GetScriptTypeName(
            AssetsManager manager, AssetsFileInstance afileInst, AssetTypeValueField bf,
            Dictionary<(int, long), string> cache)
        {
            try
            {
                int fileId = bf["m_Script"]["m_FileID"].AsInt;
                long pathId = bf["m_Script"]["m_PathID"].AsLong;
                if (pathId == 0 && fileId == 0) return null;
                if (cache.TryGetValue((fileId, pathId), out string cached)) return cached;

                var ext = manager.GetExtAsset(afileInst, fileId, pathId, true);
                if (ext.info == null || ext.file == null) return null;
                var scriptBf = manager.GetBaseField(ext.file, ext.info);
                string className = scriptBf?["m_ClassName"]?.AsString;
                if (!string.IsNullOrEmpty(className))
                    cache[(fileId, pathId)] = className;
                return className;
            }
            catch
            {
                return null;
            }
        }

        private static readonly System.Text.RegularExpressions.Regex GuidRegex =
            new System.Text.RegularExpressions.Regex(
                @"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
                System.Text.RegularExpressions.RegexOptions.Compiled);

        private static byte[] ReadRawAtOffset(string assetsPath, long offset, int size)
        {
            byte[] buf = new byte[size];
            using (var fs = new FileStream(assetsPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                fs.Position = offset;
                int read = fs.Read(buf, 0, size);
                Array.Resize(ref buf, read);
            }
            return buf;
        }

        private static int IndexOfBytes(byte[] haystack, byte[] needle)
        {
            for (int i = 0; i <= haystack.Length - needle.Length; i++)
            {
                bool match = true;
                for (int j = 0; j < needle.Length; j++)
                {
                    if (haystack[i + j] != needle[j]) { match = false; break; }
                }
                if (match) return i;
            }
            return -1;
        }

        private static string GuidFromRawAssetBytes(string assetsPath, AssetFileInfo info, long dataOffset)
        {
            try
            {
                long absOffset = info.ByteOffset + dataOffset;
                int size = (int)info.ByteSize;
                if (size <= 0) return null;
                byte[] raw = ReadRawAtOffset(assetsPath, absOffset, size);
                if (raw == null || raw.Length == 0) return null;

                // Find UTF-16LE "Guid" pattern: 47 00 75 00 69 00 64 00
                byte[] guidUtf16 = { 0x47, 0x00, 0x75, 0x00, 0x69, 0x00, 0x64, 0x00 };
                int idx = IndexOfBytes(raw, guidUtf16);
                if (idx < 0) return null;

                // The 16 bytes of GUID data follow immediately after the "Guid" name
                int guidStart = idx + guidUtf16.Length;
                if (guidStart + 16 > raw.Length) return null;

                byte[] guidBytes = new byte[16];
                Array.Copy(raw, guidStart, guidBytes, 0, 16);

                try
                {
                    var g = new Guid(guidBytes);
                    return g.ToString();
                }
                catch { return null; }
            }
            catch
            {
                return null;
            }
        }

        private static string GuidFromSerializationData(AssetTypeValueField bf)
        {
            try
            {
                var sd = bf["serializationData"];
                var bytesField = sd["SerializedBytes"];
                if (bytesField == null || bytesField.IsDummy) return null;
                byte[] bytes = bytesField.AsByteArray;
                if (bytes == null || bytes.Length == 0) return null;

                string text = Encoding.ASCII.GetString(bytes);
                var m = GuidRegex.Match(text);
                if (m.Success) return m.Value;
                return null;
            }
            catch
            {
                return null;
            }
        }

        private static string SafeStr(AssetTypeValueField bf, string field)
        {
            try
            {
                var f = bf[field];
                if (f == null || f.IsDummy) return null;
                return f.AsString;
            }
            catch
            {
                return null;
            }
        }

        private static string NormalizeGuid(string g)
        {
            if (g == null) return null;
            g = g.Trim();
            if (g.Length == 36) return g;
            if (g.Length == 32)
            {
                return $"{g.Substring(0,8)}-{g.Substring(8,4)}-{g.Substring(12,4)}-{g.Substring(16,4)}-{g.Substring(20,12)}";
            }
            return g;
        }

        private static string CsvEscape(string s)
        {
            if (s.Contains(',') || s.Contains('"') || s.Contains('\n'))
                return "\"" + s.Replace("\"", "\"\"") + "\"";
            return s;
        }
    }
}
