package autosubmit

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"os"
)

const Prefix = "lphub_autosubmit_"

func Cipher() (cipher.AEAD, error) {
	secret := os.Getenv("SECRET_KEY")
	if secret == "" {
		return nil, fmt.Errorf("SECRET_KEY must be set")
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("lphub/autosubmit/encryption/v1"))
	block, err := aes.NewCipher(mac.Sum(nil))
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(block)
}
func Generate(userID string) (string, []byte, []byte, error) {
	a, err := Cipher()
	if err != nil {
		return "", nil, nil, err
	}
	raw := make([]byte, 32)
	if _, err = rand.Read(raw); err != nil {
		return "", nil, nil, err
	}
	token := Prefix + base64.RawURLEncoding.EncodeToString(raw)
	nonce := make([]byte, a.NonceSize())
	if _, err = rand.Read(nonce); err != nil {
		return "", nil, nil, err
	}
	encrypted := a.Seal(nonce, nonce, []byte(token), []byte(userID))
	return token, Hash(token), encrypted, nil
}
func Hash(token string) []byte { h := sha256.Sum256([]byte(token)); return h[:] }
func Decrypt(userID string, encrypted []byte) (string, error) {
	a, err := Cipher()
	if err != nil {
		return "", err
	}
	if len(encrypted) < a.NonceSize() {
		return "", fmt.Errorf("invalid ciphertext")
	}
	raw, err := a.Open(nil, encrypted[:a.NonceSize()], encrypted[a.NonceSize():], []byte(userID))
	return string(raw), err
}
