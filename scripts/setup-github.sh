#!/bin/bash

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Please install it first:"
    echo "For Mac: brew install gh"
    echo "For Linux: See https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    exit 1
fi

# Check if logged in to GitHub
gh auth status &> /dev/null
if [ $? -ne 0 ]; then
    echo "You need to login to GitHub first"
    gh auth login
fi

# Create GitHub repository
echo "Creating GitHub repository for SOP Maker..."
REPO_NAME="sopmaker"
DESCRIPTION="Standard Operating Procedure (SOP) Maker - A tool to create and manage SOPs"

# Ask for repository visibility
read -p "Should the repository be public? (y/n): " IS_PUBLIC
if [[ $IS_PUBLIC == "y" || $IS_PUBLIC == "Y" ]]; then
    VISIBILITY="--public"
else
    VISIBILITY="--private"
fi

# Create the repository on GitHub
gh repo create $REPO_NAME $VISIBILITY \
    --description "$DESCRIPTION" \
    --source=. \
    --remote=origin \
    --push

if [ $? -eq 0 ]; then
    echo "Repository created successfully!"
    
    # Set up GitHub secrets for environment variables
    echo "Setting up GitHub secrets for CI/CD..."
    
    # Read from .env.local and create GitHub secrets
    while IFS='=' read -r key value || [[ -n "$key" ]]; do
        # Skip comments and empty lines
        [[ $key == \#* ]] && continue
        [[ -z "$key" ]] && continue
        
        # Remove quotes from value
        value=$(echo $value | sed 's/^"\(.*\)"$/\1/')
        
        # Create secret
        echo "Creating secret for $key"
        echo "$value" | gh secret set "$key" --repo "$(gh repo view --json nameWithOwner -q .nameWithOwner)"
    done < .env.local
    
    echo "All secrets have been created in your GitHub repository"
    echo "Your repository is now set up with CI/CD!"
else
    echo "Failed to create repository"
    exit 1
fi 