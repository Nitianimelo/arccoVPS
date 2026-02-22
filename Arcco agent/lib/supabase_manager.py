"""
Gerenciador de Supabase Storage + PostgreSQL.
Persistência segura de arquivos e metadados.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


class SupabaseFileManager:
    """Gerenciador de arquivos com Supabase Storage."""

    def __init__(self, supabase_client, bucket_name: str = "agent-files"):
        """
        Inicializa manager.

        Args:
            supabase_client: Cliente Supabase (from supabase import create_client)
            bucket_name: Nome do bucket de storage
        """
        self.client = supabase_client
        self.bucket_name = bucket_name
        self.metadata_table = "agent_files_metadata"

    async def upload_file(
        self,
        file_content: bytes,
        filename: str,
        session_id: str,
        tags: Optional[List[str]] = None,
        content_type: str = "application/octet-stream"
    ) -> dict:
        """
        Upload arquivo para Supabase Storage.

        Args:
            file_content: Bytes do arquivo
            filename: Nome do arquivo
            session_id: ID da sessão (para organização)
            tags: Tags para categorização
            content_type: Tipo MIME

        Returns:
            Dict com metadados e URL
        """
        try:
            timestamp = datetime.now().isoformat()
            remote_path = f"{session_id}/{timestamp}/{filename}"

            # 1️⃣ Upload para Storage
            response = self.client.storage.from_(self.bucket_name).upload(
                remote_path,
                file_content,
                {"contentType": content_type}
            )

            # 2️⃣ Gerar URL pública
            public_url = self._get_public_url(remote_path)

            # 3️⃣ Armazenar metadados
            metadata = {
                "session_id": session_id,
                "filename": filename,
                "remote_path": remote_path,
                "file_size": len(file_content),
                "file_type": Path(filename).suffix,
                "tags": tags or [],
                "created_at": timestamp,
                "download_url": public_url,
                "content_type": content_type,
            }

            self.client.table(self.metadata_table).insert(metadata).execute()

            logger.info(
                f"File uploaded: {filename} ({len(file_content)} bytes) "
                f"→ {public_url}"
            )

            return metadata

        except Exception as e:
            logger.error(f"Upload failed for {filename}: {e}")
            raise

    async def list_files_for_session(self, session_id: str) -> List[dict]:
        """Lista arquivos da sessão."""
        try:
            response = self.client.table(self.metadata_table).select(
                "*"
            ).eq("session_id", session_id).order(
                "created_at", desc=True
            ).execute()

            return response.data
        except Exception as e:
            logger.error(f"List files failed: {e}")
            return []

    async def delete_file(self, session_id: str, remote_path: str):
        """Delete arquivo com cleanup de metadados."""
        try:
            # Remove do Storage
            self.client.storage.from_(self.bucket_name).remove([remote_path])

            # Remove metadados
            self.client.table(self.metadata_table).delete().eq(
                "remote_path", remote_path
            ).execute()

            logger.info(f"File deleted: {remote_path}")

        except Exception as e:
            logger.error(f"Delete failed for {remote_path}: {e}")
            raise

    async def cleanup_old_sessions(self, days: int = 7):
        """
        Limpa arquivos de sessões antigas.
        Útil para reduzir custo de storage.
        """
        try:
            cutoff_date = (
                datetime.now() - timedelta(days=days)
            ).isoformat()

            old_files = self.client.table(self.metadata_table).select(
                "remote_path"
            ).lt("created_at", cutoff_date).execute()

            for file_meta in old_files.data:
                await self.delete_file(
                    session_id="",
                    remote_path=file_meta["remote_path"]
                )

            logger.info(
                f"Cleaned up {len(old_files.data)} files older than {days} days"
            )

        except Exception as e:
            logger.error(f"Cleanup failed: {e}")

    def _get_public_url(self, remote_path: str) -> str:
        """Gera URL pública para download."""
        try:
            return self.client.storage.from_(
                self.bucket_name
            ).get_public_url(remote_path)
        except Exception as e:
            logger.error(f"Failed to generate public URL: {e}")
            return f"error://{remote_path}"


class SupabaseSessionManager:
    """Gerenciador de sessões com PostgreSQL."""

    def __init__(self, supabase_client):
        self.client = supabase_client
        self.table = "agent_sessions"

    async def create_session(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> dict:
        """Cria nova sessão."""
        try:
            session_data = {
                "session_id": session_id,
                "user_id": user_id,
                "metadata": json.dumps(metadata or {}),
                "created_at": datetime.now().isoformat(),
                "last_activity": datetime.now().isoformat(),
                "status": "active"
            }

            response = self.client.table(self.table).insert(
                session_data
            ).execute()

            logger.info(f"Session created: {session_id}")
            return response.data[0]

        except Exception as e:
            logger.error(f"Session creation failed: {e}")
            raise

    async def update_session_activity(self, session_id: str):
        """Atualiza timestamp de atividade."""
        try:
            self.client.table(self.table).update({
                "last_activity": datetime.now().isoformat()
            }).eq("session_id", session_id).execute()

        except Exception as e:
            logger.error(f"Session update failed: {e}")

    async def cleanup_inactive_sessions(self, hours: int = 24):
        """Limpa sessões inativas."""
        try:
            cutoff = (
                datetime.now() - timedelta(hours=hours)
            ).isoformat()

            inactive = self.client.table(self.table).select(
                "session_id"
            ).lt("last_activity", cutoff).execute()

            session_ids = [s["session_id"] for s in inactive.data]

            if session_ids:
                self.client.table(self.table).delete().in_(
                    "session_id", session_ids
                ).execute()

                logger.info(
                    f"Cleaned up {len(session_ids)} inactive sessions"
                )

        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
