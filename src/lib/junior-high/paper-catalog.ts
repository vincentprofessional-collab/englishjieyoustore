import beijing2023 from "@/lib/junior-high/beijing-2023.json";
import beijing2024 from "@/lib/junior-high/beijing-2024-simulation.json";
import fujian2024 from "@/lib/junior-high/2024-fujian-fujian.json";
import jiangsu2023 from "@/lib/junior-high/2023-jiangsu-jiangsu.json";
import jiangsu2024 from "@/lib/junior-high/2024-jiangsu-jiangsu.json";
import guangdong2023 from "@/lib/junior-high/2023-guangdong-guangdong.json";
import hebei2023 from "@/lib/junior-high/2023-hebei-hebei.json";
import shanghai2022 from "@/lib/junior-high/2022-shanghai-shanghai.json";
import shandong2023 from "@/lib/junior-high/2023-shandong-shandong.json";
import tianjin2024 from "@/lib/junior-high/2024-tianjin-tianjin.json";
import zhejiang2023 from "@/lib/junior-high/2023-zhejiang-zhejiang.json";
import zhejiang2024 from "@/lib/junior-high/2024-zhejiang-zhejiang.json";
import type { JuniorHighPaper } from "@/lib/junior-high/paper-types";

export const JUNIOR_HIGH_PAPER_CATALOG: JuniorHighPaper[] = [
  beijing2024,
  beijing2023,
  tianjin2024,
  jiangsu2024,
  zhejiang2024,
  fujian2024,
  guangdong2023,
  jiangsu2023,
  zhejiang2023,
  shandong2023,
  hebei2023,
  shanghai2022,
] as unknown as JuniorHighPaper[];

export function getJuniorHighPaper(year: number, region: string) {
  return JUNIOR_HIGH_PAPER_CATALOG.find((paper) => paper.year === year && paper.region === region);
}
