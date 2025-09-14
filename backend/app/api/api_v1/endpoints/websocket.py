from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import Dict, List
import json
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Store active connections by type
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {
            "dashboard": {},  # For dashboard clients
            "triage": {},     # For triage assessment clients
            "general": {}     # For general clients
        }

    async def connect(self, websocket: WebSocket, connection_type: str = "general") -> str:
        """Connect a new WebSocket and return connection ID"""
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        self.active_connections[connection_type][connection_id] = websocket
        logger.info(f"New {connection_type} connection: {connection_id}")
        return connection_id

    def disconnect(self, connection_id: str):
        """Disconnect a WebSocket"""
        for connection_type in self.active_connections:
            if connection_id in self.active_connections[connection_type]:
                del self.active_connections[connection_type][connection_id]
                logger.info(f"Disconnected {connection_type} connection: {connection_id}")
                return
        logger.warning(f"Connection not found for disconnection: {connection_id}")

    async def send_personal_message(self, message: dict, connection_id: str):
        """Send message to specific connection"""
        for connection_type in self.active_connections:
            if connection_id in self.active_connections[connection_type]:
                websocket = self.active_connections[connection_type][connection_id]
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to {connection_id}: {e}")
                    self.disconnect(connection_id)
                return
        logger.warning(f"Connection not found for message: {connection_id}")

    async def broadcast_to_type(self, message: dict, connection_type: str):
        """Broadcast message to all connections of a specific type"""
        if connection_type not in self.active_connections:
            logger.warning(f"Invalid connection type: {connection_type}")
            return

        connections_to_remove = []
        for connection_id, websocket in self.active_connections[connection_type].items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")
                connections_to_remove.append(connection_id)

        # Remove failed connections
        for connection_id in connections_to_remove:
            self.disconnect(connection_id)

        logger.info(f"Broadcasted to {len(self.active_connections[connection_type])} {connection_type} connections")

    async def broadcast_all(self, message: dict):
        """Broadcast message to all connections"""
        for connection_type in self.active_connections:
            await self.broadcast_to_type(message, connection_type)

    def get_connection_count(self, connection_type: str = None) -> int:
        """Get count of active connections"""
        if connection_type:
            return len(self.active_connections.get(connection_type, {}))
        return sum(len(connections) for connections in self.active_connections.values())

# Global connection manager
manager = ConnectionManager()

@router.websocket("/ws/{connection_type}")
async def websocket_endpoint(websocket: WebSocket, connection_type: str = "general"):
    """
    WebSocket endpoint for different connection types:
    - dashboard: For dashboard clients receiving patient updates
    - triage: For triage assessment clients doing voice interaction
    - general: For any other clients
    """
    if connection_type not in ["dashboard", "triage", "general"]:
        connection_type = "general"

    connection_id = await manager.connect(websocket, connection_type)

    # Send welcome message
    await manager.send_personal_message({
        "type": "connection_established",
        "connection_id": connection_id,
        "connection_type": connection_type,
        "message": f"Connected as {connection_type} client"
    }, connection_id)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                logger.info(f"Received from {connection_id}: {message}")

                # Handle different message types
                await handle_websocket_message(message, connection_id, connection_type)

            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, connection_id)

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
        logger.info(f"Client {connection_id} disconnected")

async def handle_websocket_message(message: dict, connection_id: str, connection_type: str):
    """Handle incoming WebSocket messages"""
    message_type = message.get("type", "unknown")

    if message_type == "ping":
        # Respond to ping with pong
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": message.get("timestamp")
        }, connection_id)

    elif message_type == "broadcast_test":
        # Test broadcasting to all clients of same type
        await manager.broadcast_to_type({
            "type": "broadcast_message",
            "from": connection_id,
            "message": message.get("message", "Test broadcast")
        }, connection_type)

    elif message_type == "patient_update":
        # Broadcast patient updates to dashboard clients
        await manager.broadcast_to_type({
            "type": "patient_update",
            "data": message.get("data"),
            "timestamp": message.get("timestamp")
        }, "dashboard")

    elif message_type == "voice_data":
        # Handle voice data for triage clients
        await manager.send_personal_message({
            "type": "voice_response",
            "message": "Voice data received",
            "data": message.get("data")
        }, connection_id)

    else:
        # Echo unknown message types
        await manager.send_personal_message({
            "type": "echo",
            "original_message": message,
            "message": f"Received message type: {message_type}"
        }, connection_id)

# Additional endpoint for connection stats (useful for monitoring)
@router.get("/ws/stats")
async def websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "total_connections": manager.get_connection_count(),
        "dashboard_connections": manager.get_connection_count("dashboard"),
        "triage_connections": manager.get_connection_count("triage"),
        "general_connections": manager.get_connection_count("general")
    }