package auth

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var errNoToken = errors.New("missing token")

// Generate creates a new JWT for a user who has just successfully logged in.
func Generate(userID uint64) (string, error){
	secret := []byte(os.Getenv("JWT_SECRET"))
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

// Parse verifies a token that a user sends with their API requests to access protected resources (like starting a quiz)
func Parse(tokenStr string) (uint64, error){
	secret := []byte(os.Getenv("JWT_SECRET"))

	// Parse the token string, checks if the token is signed with the correct secret key and if the token has expired
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error){
		return secret, nil 
	})
	if err != nil || !token.Valid {
		return 0, err
	}

	// If the token is valid, it extracts the claims (the payload)
	claims := token.Claims.(jwt.MapClaims)

	// retrieves the user ID from the "sub" (subject) claim
	sub, ok := claims["sub"].(float64)
	if !ok {
		return 0, errNoToken
	}

	// returns the user's ID, confirming that the user is authenticated.
	// API handlers can use this ID to perform actions on behalf of that user.
	return uint64(sub), nil 
}