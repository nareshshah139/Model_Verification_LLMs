"""XML cache module for persisting intermediate claim extraction results."""

import hashlib
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
import xml.etree.ElementTree as ET
from datetime import datetime


class XMLCache:
    """
    Filesystem-based cache for storing intermediate XML results from claim extraction.
    
    This allows us to:
    1. Skip expensive LLM calls if we've already extracted claims from a model card
    2. Resume extraction after failures
    3. Track extraction history for debugging
    """
    
    def __init__(self, cache_dir: Optional[str] = None):
        """
        Initialize XML cache.
        
        Args:
            cache_dir: Directory to store cached XML files (default: ~/.cache/cardcheck/xml)
        """
        if cache_dir:
            self.cache_dir = Path(cache_dir)
        else:
            # Default to user's cache directory
            home = Path.home()
            self.cache_dir = home / ".cache" / "cardcheck" / "xml"
        
        # Create cache directory if it doesn't exist
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Create metadata directory for tracking cache entries
        self.metadata_dir = self.cache_dir / "metadata"
        self.metadata_dir.mkdir(exist_ok=True)
    
    def _compute_hash(self, content: str) -> str:
        """
        Compute SHA256 hash of content for cache key.
        
        Args:
            content: Content to hash (model card text)
            
        Returns:
            Hex digest of hash
        """
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def _get_cache_path(self, cache_key: str) -> Path:
        """Get path to cache file for given key."""
        return self.cache_dir / f"{cache_key}.xml"
    
    def _get_metadata_path(self, cache_key: str) -> Path:
        """Get path to metadata file for given key."""
        return self.metadata_dir / f"{cache_key}.json"
    
    def has_cache(self, model_card_text: str) -> bool:
        """
        Check if cached XML exists for given model card.
        
        Args:
            model_card_text: Full text of model card
            
        Returns:
            True if valid cache exists
        """
        cache_key = self._compute_hash(model_card_text)
        cache_path = self._get_cache_path(cache_key)
        
        if not cache_path.exists():
            return False
        
        # Validate that XML is parseable
        try:
            ET.parse(str(cache_path))
            return True
        except ET.ParseError:
            # Cache is corrupted, remove it
            cache_path.unlink()
            metadata_path = self._get_metadata_path(cache_key)
            if metadata_path.exists():
                metadata_path.unlink()
            return False
    
    def get_cache(self, model_card_text: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached extraction result for model card.
        
        Args:
            model_card_text: Full text of model card
            
        Returns:
            Dict with 'claims' list, or None if no valid cache exists
        """
        cache_key = self._compute_hash(model_card_text)
        cache_path = self._get_cache_path(cache_key)
        
        if not cache_path.exists():
            return None
        
        try:
            # Parse XML
            tree = ET.parse(str(cache_path))
            root = tree.getroot()
            
            # Convert to dict structure
            result = self._xml_to_dict(root)
            
            # Load metadata
            metadata_path = self._get_metadata_path(cache_key)
            if metadata_path.exists():
                metadata = json.loads(metadata_path.read_text())
                result['_cache_metadata'] = metadata
            
            return result
            
        except Exception as e:
            # Cache is corrupted, remove it
            print(f"[XMLCache] Failed to load cache: {e}")
            cache_path.unlink()
            metadata_path = self._get_metadata_path(cache_key)
            if metadata_path.exists():
                metadata_path.unlink()
            return None
    
    def save_cache(
        self,
        model_card_text: str,
        claims: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Save extraction result to cache.
        
        Args:
            model_card_text: Full text of model card
            claims: List of extracted claims
            metadata: Optional metadata about extraction (provider, model, timestamp, etc.)
            
        Returns:
            Cache key (hash)
        """
        cache_key = self._compute_hash(model_card_text)
        cache_path = self._get_cache_path(cache_key)
        
        # Convert claims to XML
        xml_str = self._dict_to_xml(claims)
        
        # Save XML
        cache_path.write_text(xml_str, encoding='utf-8')
        
        # Save metadata
        if metadata is None:
            metadata = {}
        
        metadata.update({
            'cache_key': cache_key,
            'cached_at': datetime.utcnow().isoformat(),
            'model_card_length': len(model_card_text),
            'claims_count': len(claims),
        })
        
        metadata_path = self._get_metadata_path(cache_key)
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding='utf-8')
        
        return cache_key
    
    def _dict_to_xml(self, claims: List[Dict[str, Any]]) -> str:
        """
        Convert claims list to XML string.
        
        Args:
            claims: List of claim dicts
            
        Returns:
            XML string
        """
        root = ET.Element('claims')
        
        for claim in claims:
            claim_elem = ET.SubElement(root, 'claim')
            
            for key, value in claim.items():
                # Skip internal fields
                if key.startswith('_'):
                    continue
                
                if isinstance(value, list):
                    # Create container element for lists
                    list_elem = ET.SubElement(claim_elem, key)
                    for item in value:
                        item_elem = ET.SubElement(list_elem, 'item')
                        item_elem.text = str(item)
                elif isinstance(value, dict):
                    # Create nested elements for dicts
                    dict_elem = ET.SubElement(claim_elem, key)
                    for sub_key, sub_value in value.items():
                        sub_elem = ET.SubElement(dict_elem, sub_key)
                        sub_elem.text = str(sub_value)
                else:
                    # Simple value
                    elem = ET.SubElement(claim_elem, key)
                    elem.text = str(value) if value is not None else ""
        
        # Pretty print
        self._indent(root)
        tree = ET.ElementTree(root)
        
        # Convert to string
        import io
        buffer = io.StringIO()
        tree.write(buffer, encoding='unicode', xml_declaration=True)
        return buffer.getvalue()
    
    def _xml_to_dict(self, root: ET.Element) -> Dict[str, Any]:
        """
        Convert XML ElementTree to dict structure.
        
        Args:
            root: Root XML element
            
        Returns:
            Dict with 'claims' list
        """
        def element_to_value(elem: ET.Element) -> Any:
            """Convert XML element to Python value."""
            if len(elem) > 0:
                # Has children
                children_tags = [child.tag for child in elem]
                
                # Check if all children are <item> tags (it's a list)
                if all(tag == 'item' for tag in children_tags):
                    return [child.text.strip() if child.text else "" for child in elem]
                else:
                    # It's a dict
                    result = {}
                    for child in elem:
                        child_value = element_to_value(child)
                        if child.tag in result:
                            # Multiple children with same tag - make it a list
                            if not isinstance(result[child.tag], list):
                                result[child.tag] = [result[child.tag]]
                            result[child.tag].append(child_value)
                        else:
                            result[child.tag] = child_value
                    return result
            else:
                # Leaf element
                return elem.text.strip() if elem.text else ""
        
        # Parse claims
        if root.tag != 'claims':
            raise ValueError(f"Expected root tag 'claims', got '{root.tag}'")
        
        claims_list = []
        for claim_elem in root:
            if claim_elem.tag == 'claim':
                claim_dict = {}
                for child in claim_elem:
                    claim_dict[child.tag] = element_to_value(child)
                claims_list.append(claim_dict)
        
        return {'claims': claims_list}
    
    def _indent(self, elem: ET.Element, level: int = 0):
        """Add pretty-printing indentation to XML tree."""
        indent = "\n" + "  " * level
        if len(elem):
            if not elem.text or not elem.text.strip():
                elem.text = indent + "  "
            if not elem.tail or not elem.tail.strip():
                elem.tail = indent
            for child in elem:
                self._indent(child, level + 1)
            if not child.tail or not child.tail.strip():
                child.tail = indent
        else:
            if level and (not elem.tail or not elem.tail.strip()):
                elem.tail = indent
    
    def clear_cache(self, model_card_text: Optional[str] = None):
        """
        Clear cache entries.
        
        Args:
            model_card_text: If provided, clear only cache for this model card.
                           If None, clear entire cache.
        """
        if model_card_text:
            # Clear specific entry
            cache_key = self._compute_hash(model_card_text)
            cache_path = self._get_cache_path(cache_key)
            if cache_path.exists():
                cache_path.unlink()
            
            metadata_path = self._get_metadata_path(cache_key)
            if metadata_path.exists():
                metadata_path.unlink()
        else:
            # Clear entire cache
            import shutil
            shutil.rmtree(self.cache_dir)
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            self.metadata_dir.mkdir(exist_ok=True)
    
    def list_cached_entries(self) -> List[Dict[str, Any]]:
        """
        List all cached entries with metadata.
        
        Returns:
            List of metadata dicts
        """
        entries = []
        for metadata_path in self.metadata_dir.glob("*.json"):
            try:
                metadata = json.loads(metadata_path.read_text())
                entries.append(metadata)
            except Exception as e:
                print(f"[XMLCache] Failed to load metadata from {metadata_path}: {e}")
        
        # Sort by cached_at timestamp (most recent first)
        entries.sort(key=lambda x: x.get('cached_at', ''), reverse=True)
        return entries
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dict with cache stats
        """
        xml_files = list(self.cache_dir.glob("*.xml"))
        metadata_files = list(self.metadata_dir.glob("*.json"))
        
        total_size = sum(f.stat().st_size for f in xml_files)
        
        return {
            'cache_dir': str(self.cache_dir),
            'entries_count': len(xml_files),
            'metadata_count': len(metadata_files),
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
        }

