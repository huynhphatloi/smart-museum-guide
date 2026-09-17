from museum_ai.signing import sign, verify

SECRET = "test-secret-with-enough-length"
BODY = b'{"taskId":"abc","event":"task.completed"}'
NOW = 1789632000  # 2026-09-17T08:00:00Z


def test_matches_the_backend_implementation():
    # Same fixture as backend/api/src/localization/ai-service-signature.spec.ts
    assert sign(SECRET, BODY, NOW) == (
        "t=1789632000,v1=61cab1ed109657cc39ecf6a3932579462e36748788a8a69a9e601acc68b7c6a7"
    )


def test_verifies_its_own_signature():
    assert verify(SECRET, sign(SECRET, BODY, NOW), BODY, NOW)


def test_rejects_tampering_wrong_secret_and_stale_requests():
    header = sign(SECRET, BODY, NOW)
    assert not verify(SECRET, header, BODY.replace(b"abc", b"xyz"), NOW)
    assert not verify("another-secret-of-enough-length", header, BODY, NOW)
    assert not verify(SECRET, header, BODY, NOW + 600)


def test_rejects_missing_or_malformed_headers():
    assert not verify(SECRET, None, BODY, NOW)
    assert not verify(SECRET, "garbage", BODY, NOW)
    assert not verify(SECRET, "t=abc,v1=00", BODY, NOW)
