#!/usr/bin/env python3
"""Example usage of CodeAct CardCheck agent."""

from agent_main import CardCheckAgent
from pathlib import Path

# Example: Verify a model card against a repository
if __name__ == "__main__":
    # Initialize agent
    agent = CardCheckAgent(
        workdir="./workdir",
        runtime_enabled=False,  # Set to True to enable dynamic metrics
        sg_binary="sg",  # Ensure ast-grep is installed
    )

    # Example model card path (create this file)
    model_card_path = "example_model_card.md"

    # Example: Clone and verify
    # report = agent.verify(
    #     model_card_path=model_card_path,
    #     repo_url="https://github.com/allmeidaapedro/Lending-Club-Credit-Scoring.git",
    #     output_dir="./reports",
    # )

    # Or use local repository
    # report = agent.verify(
    #     model_card_path=model_card_path,
    #     repo_path="./local-repo",
    #     output_dir="./reports",
    # )

    print("See README.md for usage examples")

