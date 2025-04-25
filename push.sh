#!/bin/bash
# Push script for GitHub
# Use HTTPS or SSH without hardcoding tokens
git remote set-url origin https://github.com/durellwilson/sop_maker.git
# Or use SSH: git remote set-url origin git@github.com:durellwilson/sop_maker.git
git push -u origin main
echo "Push completed, check GitHub repository at: https://github.com/durellwilson/sop_maker" 