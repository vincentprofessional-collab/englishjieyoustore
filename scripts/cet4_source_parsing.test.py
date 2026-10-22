"""Regression cases for source ambiguities found during the CET-4 audit."""
import ast
import re
import unittest
import unicodedata
from functools import lru_cache
from pathlib import Path

from cet4_source_common import option, plain_word_fields

# Load only the pure parsing functions, without opening the external source
# drive or invoking the importer. Tests remain available on a clean checkout.
tree=ast.parse(Path(__file__).with_name('cet4-legacy-build.py').read_text())
names={'DATE','PART','ANSWER','RECORD','OPT','canonical_date','split_answers','answer_map','records','parse_options'}
nodes=[node for node in tree.body if isinstance(node,ast.FunctionDef)and node.name in names or isinstance(node,ast.Assign)and any(isinstance(target,ast.Name)and target.id in names for target in node.targets)]
helpers={'re':re,'unicodedata':unicodedata,'lru_cache':lru_cache,'option':option,'plain_word_fields':plain_word_fields}
exec(compile(ast.Module(body=nodes,type_ignores=[]),'<source parsers>','exec'),helpers)
pdf_tree=ast.parse(Path(__file__).with_name('cet4-legacy-pdf-build.py').read_text())
pdf_names={'RECORD','OPTION','records','choice_options','normalized','raw_sections','prove_key'}
pdf_nodes=[node for node in pdf_tree.body if isinstance(node,ast.FunctionDef)and node.name in pdf_names or isinstance(node,ast.Assign)and any(isinstance(target,ast.Name)and target.id in pdf_names for target in node.targets)]
pdf_helpers={'re':re}
exec(compile(ast.Module(body=pdf_nodes,type_ignores=[]),'<option alignment>','exec'),pdf_helpers)


class SourceParsing(unittest.TestCase):
    def test_first_answer_table_row_is_preserved(self):
        question='Question text\n'*70
        table='1. A  2. D  3. B  4. C  5. A\n6. B\n'
        body,tail=helpers['split_answers'](question+table)
        self.assertEqual(body,question)
        self.assertEqual(helpers['answer_map'](tail)[0]['1'],'A')
        self.assertEqual(helpers['answer_map'](tail)[0]['5'],'A')

    def test_full_question_options_are_not_answer_keys(self):
        keys,_=helpers['answer_map']('11. A) First choice.\nB) Second choice.\nC) Third choice.\nD) Fourth choice.')
        self.assertNotIn('11',keys)

    def test_selected_answer_and_chinese_annotation_formats(self):
        keys,_=helpers['answer_map']('11. C) He cannot get access to the book.\n12. What does she mean?\nB)【精析】这是清晰的标准答案。\n13. What follows?\nD。【详解】这是清晰的标准答案。')
        self.assertEqual({n:keys[n]for n in ['11','12','13']},{'11':'C','12':'B','13':'D'})

    def test_dictation_commentary_is_not_part_of_the_answer(self):
        keys,_=helpers['answer_map']('26. prospering。【详解】此处应该填现在分词。\n27. take into account。 【详解】短语解释。')
        self.assertEqual(keys['26'],'prospering')
        self.assertEqual(keys['27'],'take into account')

    def test_conflicting_explicit_answers_are_quarantined(self):
        keys,conflicts=helpers['answer_map']('11. A\n11. B\n')
        self.assertNotIn('11',keys)
        self.assertIn('11',conflicts)

    def test_chinese_variant_names_and_full_width_choices(self):
        self.assertEqual(helpers['canonical_date']('2013年12月四级阅读真题（二）.pdf'),'201312-2')
        keys,_=helpers['answer_map']('１１．Ｃ\n１２．Ａ\n')
        self.assertEqual(keys,{'11':'C','12':'A'})

    def test_word_hyperlink_field_does_not_eat_visible_answers(self):
        value='HYPERLINK "https://source.example/doc" \\o "参考答案:A" 1. A'
        self.assertEqual(plain_word_fields(value).strip(),'1. A')

    def test_same_question_with_shuffled_options_uses_answer_text(self):
        source={'body':'Section A\n1. A) Red apple.\nB) Blue sky.\nC) Green leaf.\nD) White cloud.',
                'answers':'1. A) Blue sky.\nB) Red apple.\nC) Green leaf.\nD) White cloud.\n【精析】B。'}
        self.assertEqual(pdf_helpers['prove_key'](source,'a',1,'choice','B'),('A','selected-option-text'))

    def test_transcript_without_an_option_correspondence_is_held(self):
        source={'body':'Section A\n1. A) Red apple.\nB) Blue sky.\nC) Green leaf.\nD) White cloud.',
                'answers':'1. M: What do you want?\nW: Something fresh.\n【精析】A。'}
        self.assertIsNone(pdf_helpers['prove_key'](source,'a',1,'choice','A'))

    def test_word_bank_uses_the_selected_word_instead_of_a_foreign_letter(self):
        source={'body':'Section A\nA) treasure\nB) decade\nC) prospering',
                'answers':'36. K) treasure。【详解】此处使用名词。'}
        self.assertEqual(pdf_helpers['prove_key'](source,'a',36,'bank','K'),('A','selected-answer-word'))

    def test_time_is_not_a_question_number(self):
        keys,_=helpers['answer_map']('21. A) Thursday evening from 7:00 to 9:45. A) 周四晚。\nB) Two weeks. B) 两周。\nC) Monday evenings. C) 周一晚。\nD) Three hours. D) 三小时。\n【正确项分析】整合以上信息，应选C。\n【干扰项分析】选项A错误。')
        self.assertNotIn('45',keys)
        self.assertEqual(keys['21'],'C')

    def test_bilingual_options_do_not_imply_answer_a(self):
        keys,_=helpers['answer_map']('21. A) Red. A) 红。\nB) Blue. B) 蓝。\nC) Green. C) 绿。\nD) White. D) 白。')
        self.assertNotIn('21',keys)

    def test_annotation_without_an_answer_stays_missing(self):
        keys,_=helpers['answer_map']('45.【听音指导】本题需要写出一个完整句子。')
        self.assertNotIn('45',keys)

    def test_numeric_option_is_not_removed_as_a_page_number(self):
        self.assertEqual(option('A','42')['blocks'][0]['runs'][0]['text'],'42')


if __name__=='__main__':unittest.main()
