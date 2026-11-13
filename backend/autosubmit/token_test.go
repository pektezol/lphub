package autosubmit

import (
	"testing"
)

func TestTokenRoundTrip(t *testing.T) {
	t.Setenv("SECRET_KEY", "test-secret")
	token, hash, encrypted, err := Generate("owner")
	if err != nil {
		t.Fatal(err)
	}
	if len(hash) != 32 {
		t.Fatal("invalid hash")
	}
	plain, err := Decrypt("owner", encrypted)
	if err != nil || plain != token {
		t.Fatal("round trip failed")
	}
	if _, err := Decrypt("other", encrypted); err == nil {
		t.Fatal("wrong owner accepted")
	}
	encrypted[len(encrypted)-1] ^= 1
	if _, err := Decrypt("owner", encrypted); err == nil {
		t.Fatal("tampered ciphertext accepted")
	}
	other, _, _, err := Generate("owner")
	if err != nil || other == token {
		t.Fatal("tokens must be distinct")
	}
}
func TestInvalidKey(t *testing.T) {
	t.Setenv("SECRET_KEY", "")
	if _, err := Cipher(); err == nil {
		t.Fatal("missing key accepted")
	}
}

func TestSecretRotation(t *testing.T) {
	t.Setenv("SECRET_KEY", "original-secret")
	token, _, encrypted, err := Generate("owner")
	if err != nil {
		t.Fatal(err)
	}
	t.Setenv("SECRET_KEY", "replacement-secret")
	if _, err := Decrypt("owner", encrypted); err == nil {
		t.Fatal("rotated secret decrypted old ciphertext")
	}
	t.Setenv("SECRET_KEY", "original-secret")
	plain, err := Decrypt("owner", encrypted)
	if err != nil || plain != token {
		t.Fatal("restored secret failed to decrypt")
	}
}
