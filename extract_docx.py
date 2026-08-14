# -*- coding: utf-8 -*-
"""Extract text from a .docx file preserving paragraph structure and headings."""
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}


def extract(path):
    with zipfile.ZipFile(path) as z:
        xml_data = z.read('word/document.xml')
    root = ET.fromstring(xml_data)
    body = root.find('w:body', NS)
    lines = []

    def para_text(p):
        # detect style
        style = ''
        pPr = p.find('w:pPr', NS)
        if pPr is not None:
            pStyle = pPr.find('w:pStyle', NS)
            if pStyle is not None:
                style = pStyle.get('{%s}val' % NS['w']) or ''
        texts = []
        for t in p.iter('{%s}t' % NS['w']):
            if t.text:
                texts.append(t.text)
        # also handle line breaks / tabs
        txt = ''.join(texts)
        prefix = ''
        if style.lower().startswith('heading'):
            lvl = ''.join(ch for ch in style if ch.isdigit()) or '1'
            prefix = '#' * int(lvl) + ' '
        elif style in ('Title', '0'):
            prefix = '# '
        return prefix + txt

    def walk(el):
        for child in el:
            tag = child.tag.split('}')[-1]
            if tag == 'p':
                lines.append(para_text(child))
            elif tag == 'tbl':
                for tr in child.findall('w:tr', NS):
                    cells = []
                    for tc in tr.findall('w:tc', NS):
                        cell_texts = []
                        for p in tc.findall('w:p', NS):
                            cell_texts.append(para_text(p).lstrip('#').strip())
                        cells.append(' '.join(cell_texts).strip())
                    lines.append('| ' + ' | '.join(cells) + ' |')
                lines.append('')
            else:
                walk(child)

    walk(body)
    return '\n'.join(lines)


if __name__ == '__main__':
    path = sys.argv[1]
    out = extract(path)
    sys.stdout.buffer.write(out.encode('utf-8'))
