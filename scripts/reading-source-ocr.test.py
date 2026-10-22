import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('source_ocr',Path(__file__).with_name('reading-source-ocr.py'))
ocr=importlib.util.module_from_spec(spec)
spec.loader.exec_module(ocr)


class TesseractSourceTest(unittest.TestCase):
    def test_literal_quotes_never_swallow_following_words_or_coordinates(self):
        header='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'
        rows=['5\t1\t1\t1\t1\t1\t20\t30\t30\t12\t98\t"first',
              '5\t1\t1\t1\t1\t2\t55\t30\t30\t12\t97\tsecond',
              '5\t1\t1\t1\t1\t3\t90\t30\t30\t12\t96\tthird"']
        words=list(ocr.tsv_words(header+'\n'.join(rows)+'\n'))
        self.assertEqual([w['text'] for w in words],['"first','second','third"'])
        self.assertEqual([int(w['left']) for w in words],[20,55,90])
        self.assertTrue(all('\t' not in w['text'] and '\n' not in w['text'] for w in words))


if __name__=='__main__':unittest.main()
