"""
Cloudflare R2 Storage Helper
Handles file upload, download, delete, and presigned URL generation.
Uses S3-compatible API via boto3.
"""

import boto3
import os
import logging
from botocore.client import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def _get_client():
    """Create a boto3 S3 client configured for Cloudflare R2."""
    from config import settings
    account_id = settings.r2_account_id
    access_key = settings.r2_access_key_id
    secret_key = settings.r2_secret_access_key
    endpoint   = f"https://{account_id}.r2.cloudflarestorage.com"

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def _bucket() -> str:
    from config import settings
    return settings.r2_bucket_name


def upload_bytes(file_bytes: bytes, key: str, content_type: str = "application/octet-stream") -> str:
    """
    Upload raw bytes to R2.
    Returns the R2 key (used as the file identifier).
    """
    client = _get_client()
    bucket = _bucket()
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    logger.info(f"Uploaded to R2: {key}")
    return key


def download_bytes(key: str) -> bytes:
    """Download a file from R2 and return its raw bytes."""
    client = _get_client()
    response = client.get_object(Bucket=_bucket(), Key=key)
    return response["Body"].read()


def delete_file(key: str) -> None:
    """Delete a file from R2. Silently ignores missing files."""
    try:
        client = _get_client()
        client.delete_object(Bucket=_bucket(), Key=key)
        logger.info(f"Deleted from R2: {key}")
    except ClientError as e:
        logger.warning(f"R2 delete warning for {key}: {e}")


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """
    Generate a pre-signed URL for temporary public access to a file.
    Default expiry: 1 hour.
    """
    client = _get_client()
    url = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": _bucket(), "Key": key},
        ExpiresIn=expires_in,
    )
    return url


def is_r2_key(path: str) -> bool:
    """
    Distinguish between old local disk paths and new R2 keys.
    Local paths start with '/' or '.'; R2 keys look like 'client_id/subfolder/filename'.
    """
    if not path:
        return False
    return not path.startswith("/") and not path.startswith(".")
