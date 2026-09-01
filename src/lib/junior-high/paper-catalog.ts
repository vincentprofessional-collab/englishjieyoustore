import beijing2023 from "@/lib/junior-high/beijing-2023.json";
import beijing2024 from "@/lib/junior-high/beijing-2024-simulation.json";
import anhui2024 from "@/lib/junior-high/2024-anhui-anhui.json";
import chongqing2024 from "@/lib/junior-high/2024-chongqing-chongqing.json";
import gansuPingliang2022 from "@/lib/junior-high/2022-gansu-pingliang-gansu-pingliang.json";
import guangdong2022 from "@/lib/junior-high/2022-guangdong-guangdong.json";
import guangxi2024 from "@/lib/junior-high/2024-guangxi-guangxi.json";
import hainan2022 from "@/lib/junior-high/2022-hainan-hainan.json";
import hubeiWuhan2024 from "@/lib/junior-high/2024-hubei-wuhan-hubei-wuhan.json";
import hunan2024 from "@/lib/junior-high/2024-hunan-hunan.json";
import hunanChangsha2024 from "@/lib/junior-high/2024-hunan-changsha-hunan-changsha.json";
import hunanHuaihua2023 from "@/lib/junior-high/2023-hunan-huaihua-hunan-huaihua.json";
import henan2024 from "@/lib/junior-high/2024-henan-henan.json";
import fujian2024 from "@/lib/junior-high/2024-fujian-fujian.json";
import jiangsu2024 from "@/lib/junior-high/2024-jiangsu-jiangsu.json";
import jiangsu2023 from "@/lib/junior-high/2023-jiangsu-jiangsu.json";
import jiangxi2024 from "@/lib/junior-high/2024-jiangxi-jiangxi.json";
import guangdong2023 from "@/lib/junior-high/2023-guangdong-guangdong.json";
import hebei2023 from "@/lib/junior-high/2023-hebei-hebei.json";
import hebei2022 from "@/lib/junior-high/2022-hebei-hebei.json";
import shanghai2022 from "@/lib/junior-high/2022-shanghai-shanghai.json";
import shandong2023 from "@/lib/junior-high/2023-shandong-shandong.json";
import shaanxi2024 from "@/lib/junior-high/2024-shaanxi-shaanxi.json";
import sichuanChengdu2024 from "@/lib/junior-high/2024-sichuan-chengdu-sichuan-chengdu.json";
import sichuanChengdu2023 from "@/lib/junior-high/2023-sichuan-chengdu-sichuan-chengdu.json";
import sichuanLiangshan2022 from "@/lib/junior-high/2022-sichuan-liangshan-sichuan-liangshan.json";
import sichuanYibin2022 from "@/lib/junior-high/2022-sichuan-yibin-sichuan-yibin.json";
import sichuanZiyang2022 from "@/lib/junior-high/2022-sichuan-ziyang-sichuan-ziyang.json";
import tianjin2024 from "@/lib/junior-high/2024-tianjin-tianjin.json";
import xinjiang2022 from "@/lib/junior-high/2022-xinjiang-xinjiang.json";
import yunnanKunming2022 from "@/lib/junior-high/2022-yunnan-kunming-yunnan-kunming.json";
import zhejiang2023 from "@/lib/junior-high/2023-zhejiang-zhejiang.json";
import zhejiang2024 from "@/lib/junior-high/2024-zhejiang-zhejiang.json";
import type { JuniorHighPaper } from "@/lib/junior-high/paper-types";

export const JUNIOR_HIGH_PAPER_CATALOG: JuniorHighPaper[] = [
  beijing2024,
  beijing2023,
  anhui2024,
  chongqing2024,
  gansuPingliang2022,
  guangdong2022,
  guangxi2024,
  hainan2022,
  hebei2022,
  hubeiWuhan2024,
  henan2024,
  hunan2024,
  hunanChangsha2024,
  hunanHuaihua2023,
  tianjin2024,
  jiangsu2024,
  jiangsu2023,
  jiangxi2024,
  zhejiang2024,
  fujian2024,
  guangdong2023,
  zhejiang2023,
  shandong2023,
  hebei2023,
  shanghai2022,
  shaanxi2024,
  sichuanChengdu2024,
  sichuanChengdu2023,
  sichuanLiangshan2022,
  sichuanYibin2022,
  sichuanZiyang2022,
  xinjiang2022,
  yunnanKunming2022,
] as unknown as JuniorHighPaper[];

export function getJuniorHighPaper(year: number, region: string) {
  return JUNIOR_HIGH_PAPER_CATALOG.find((paper) => paper.year === year && paper.region === region);
}
