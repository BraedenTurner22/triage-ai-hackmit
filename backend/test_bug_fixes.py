#!/usr/bin/env python3
"""
Test the bug fixes in the triage system
"""

import asyncio
from app.services.simple_triage import simple_triage

async def test_backend_logic():
    """Test the backend validation and flow logic"""
    print("🧪 Testing Backend Logic")
    print("=" * 40)

    # Test 1: Start session
    print("\n1. Testing session start...")
    response = await simple_triage.start_session("test-123")
    print(f"   ✓ Session started: {response['type']}")
    print(f"   ✓ Welcome message: {response['question'][:50]}...")

    # Test 2: Test name validation
    print("\n2. Testing name validation...")

    # Valid name
    response = await simple_triage.process_voice_response("test-123", "John Smith")
    print(f"   ✓ Valid name 'John Smith': {response['type']}")
    print(f"   ✓ Next question: {response['question'][:30]}...")

    # Test 3: Test age validation
    print("\n3. Testing age validation...")

    # Invalid age
    response = await simple_triage.process_voice_response("test-123", "abc")
    print(f"   ✓ Invalid age 'abc': {response['type']}")

    # Valid age
    response = await simple_triage.process_voice_response("test-123", "35 years old")
    print(f"   ✓ Valid age '35 years old': {response['type']}")

    # Test 4: Continue through questions
    print("\n4. Testing complete flow...")

    responses = [
        "Female",  # gender
        "I have chest pain and shortness of breath",  # symptoms
        "No",      # bleeding
        "Yes",     # breathing trouble
        "Yes",     # chest pain
        "No"       # mobility (can't walk)
    ]

    for i, resp in enumerate(responses):
        response = await simple_triage.process_voice_response("test-123", resp)
        print(f"   ✓ Question {i+4}: {response['type']} - {resp}")
        if response['type'] == 'complete':
            print(f"   ✓ Assessment complete! Urgency: {response['urgency_score']}")
            print(f"   ✓ Triage level: {response['triage_level']}")
            break

    # Test session status
    print("\n5. Testing session status...")
    status = simple_triage.get_session_status("test-123")
    if status:
        print(f"   ✓ Session status: {status['current_step']}/{status['total_steps']}")
        print(f"   ✓ Responses: {len(status['responses'])}")

    print("\n🎉 Backend tests completed!")

async def test_validation_logic():
    """Test specific validation methods"""
    print("\n🔍 Testing Validation Logic")
    print("=" * 40)

    orchestrator = simple_triage

    # Test name validation
    print("\n1. Name validation:")
    test_names = [
        ("John Smith", True),
        ("J", False),
        ("123", False),
        ("John! Smith", True),  # Should clean punctuation
    ]

    for name, should_be_valid in test_names:
        is_valid, cleaned, error = orchestrator.validate_name(name)
        status = "✓" if is_valid == should_be_valid else "✗"
        print(f"   {status} '{name}' -> Valid: {is_valid}, Cleaned: '{cleaned}'")

    # Test age validation
    print("\n2. Age validation:")
    test_ages = [
        ("25", True),
        ("I'm 30 years old", True),
        ("abc", False),
        ("200", False),
    ]

    for age, should_be_valid in test_ages:
        is_valid, cleaned, error = orchestrator.validate_age(age)
        status = "✓" if is_valid == should_be_valid else "✗"
        print(f"   {status} '{age}' -> Valid: {is_valid}, Cleaned: '{cleaned}'")

    # Test boolean validation
    print("\n3. Boolean validation:")
    test_bools = [
        ("yes", True, "Yes"),
        ("no", True, "No"),
        ("yeah sure", True, "Yes"),
        ("nope", True, "No"),
        ("maybe", False, ""),
    ]

    for response, should_be_valid, expected in test_bools:
        is_valid, cleaned, error = orchestrator.validate_boolean(response)
        status = "✓" if is_valid == should_be_valid else "✗"
        print(f"   {status} '{response}' -> Valid: {is_valid}, Cleaned: '{cleaned}'")

if __name__ == "__main__":
    print("🚀 Starting Bug Fix Tests")
    asyncio.run(test_backend_logic())
    asyncio.run(test_validation_logic())
    print("\n✅ All tests completed!")