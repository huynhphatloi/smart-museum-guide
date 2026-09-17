from museum_ai.text import chunk_text, narration_text, split_sentences


def test_narration_text_ends_every_part_like_a_sentence():
    assert narration_text("Trống đồng Đông Sơn", "Thời đại đồ đồng", None) == (
        "Trống đồng Đông Sơn.\nThời đại đồ đồng."
    )
    assert narration_text("Cham statue!", "  ", "A 10th century work.") == (
        "Cham statue!\nA 10th century work."
    )


def test_splits_sentences_across_scripts():
    assert split_sentences('He said "Hello." Then left. Done?') == [
        'He said "Hello."',
        "Then left.",
        "Done?",
    ]
    assert split_sentences("这是铜鼓。它很古老！") == ["这是铜鼓。", "它很古老！"]
    assert split_sentences("ស្គរ​សំរិទ្ធ។ វា​ចាស់។") == ["ស្គរ​សំរិទ្ធ។", "វា​ចាស់។"]


def test_chunks_group_sentences_under_the_limit():
    text = "One two three. Four five six. Seven eight nine."
    assert chunk_text(text, 30) == ["One two three. Four five six.", "Seven eight nine."]


def test_chunks_split_long_sentences_on_spaces_or_hard():
    assert chunk_text("aaaa bbbb cccc dddd", 10) == ["aaaa bbbb", "cccc dddd"]
    assert chunk_text("x" * 25, 10) == ["x" * 10, "x" * 10, "x" * 5]
    assert all(len(chunk) <= 10 for chunk in chunk_text("ข้อความภาษาไทยยาวมาก ไม่มีจุด", 10))
