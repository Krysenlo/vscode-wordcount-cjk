import deburr from "lodash.deburr";
import { widthsMap, WidthsMap } from "./widthsMap";
type Font = "Microsoft YaHei";

interface Settings {
    bold?: boolean;
    font?: Font;
    italic?: boolean;
    size?: number;
    map?: WidthsMap;
}

const settingsDefaults: Settings = { font: "Microsoft YaHei", size: 100 };

export default function getWidth(string: string, settings?: Settings): number {
    const sett: Settings = Object.assign({}, settingsDefaults, settings);
    const font = sett.font!.toLowerCase();
    const size = sett.size!;
    const variant = 0 + (sett.bold ? 1 : 0) + (sett.italic ? 2 : 0);
    const map = sett?.map || widthsMap;
    let totalWidth = 0;
    deburr(string)
        .split("")
        ?.forEach((char) => {
            if (/[\x00-\x1F]/.test(char)) {
                // non-printable character
                return true;
            }
            // use width of 'x' as fallback for unregistered char
            const widths = map[font][char] || [100, 100, 100, 100];
            const width = widths[variant];
            totalWidth += width;
            return true;
        });
    return totalWidth * (size / 100);
}
