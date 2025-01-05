import json
import base64
from typing import Dict, Any, Type, Tuple, Optional

class GlyphEncoder:
    """Base class for glyph-based encoders"""
    
    def __init__(self):
        self.name = "base"
        self.debug = False
        
    def encode(self, data: Dict[str, Any]) -> str:
        """Encode data into a string of glyphs"""
        raise NotImplementedError
        
    def decode(self, text: str) -> Dict[str, Any]:
        """Decode a string of glyphs back into data"""
        raise NotImplementedError
        
    def try_decode(self, text: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Attempt to decode text, returning (success, result, error)"""
        try:
            result = self.decode(text)
            return True, result, None
        except Exception as e:
            return False, None, str(e)

class ASCIIEncoder(GlyphEncoder):
    """Encodes data using hexadecimal encoding with length prefix"""
    
    def __init__(self):
        super().__init__()
        self.name = "ascii"
        self.debug = True
        
    def format_json(self, data: Dict[str, Any]) -> str:
        """Format JSON data with proper indentation"""
        return json.dumps(data, indent=2)
        
    def encode(self, data: Dict[str, Any]) -> str:
        try:
            # Convert data to JSON with minimal formatting
            json_str = json.dumps(data, ensure_ascii=True, separators=(',', ':'))
            
            if self.debug:
                print(f"Encoding:")
                print(f"  Original data: {data}")
                print(f"  JSON string: {json_str}")
            
            # Convert to bytes
            bytes_data = json_str.encode('ascii')
            
            # Convert to hex with length prefix
            hex_data = bytes_data.hex()
            length = len(bytes_data)
            result = f"{length:08x}{hex_data}"
            
            if self.debug:
                print(f"  Final length: {len(result)}")
                print(f"  Result: {result[:50]}...")
            
            return result
            
        except Exception as e:
            if self.debug:
                print(f"Error during encode: {str(e)}")
                import traceback
                traceback.print_exc()
            raise
        
    def decode(self, text: str) -> Dict[str, Any]:
        try:
            if self.debug:
                print(f"\nDecoding:")
                print(f"  Input length: {len(text)}")
                print("  First 50 chars:", repr(text[:50]))
            
            # Strip whitespace
            text = text.strip()
            
            # Must be hex digits
            if not all(c in '0123456789abcdefABCDEF' for c in text):
                raise ValueError("Invalid characters in input (must be hex digits)")
            
            # Get length from prefix (8 hex digits)
            try:
                length = int(text[:8], 16)
                if length < 0:
                    raise ValueError(f"Invalid length prefix: {length}")
            except ValueError as e:
                raise ValueError(f"Invalid length prefix: {str(e)}")
            
            if self.debug:
                print(f"  Message length: {length}")
            
            # Extract message bytes
            try:
                hex_data = text[8:8+length*2]  # Each byte is 2 hex digits
                if len(hex_data) != length * 2:
                    raise ValueError(f"Message truncated: expected {length*2} hex digits but got {len(hex_data)}")
                    
                bytes_data = bytes.fromhex(hex_data)
                if self.debug:
                    print(f"  Decoded bytes: {bytes_data}")
            except ValueError as e:
                raise ValueError(f"Invalid hex data: {str(e)}")
            
            # Decode JSON
            try:
                json_str = bytes_data.decode('ascii')
                if self.debug:
                    print(f"  JSON string: {json_str}")
                
                result = json.loads(json_str)
                if self.debug:
                    print(f"\n  Final result (formatted):")
                    print(self.format_json(result))
                
                return result
                
            except UnicodeDecodeError as e:
                raise ValueError(f"Invalid ASCII data: {str(e)}")
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON at position {e.pos}: {e.msg}")
            except Exception as e:
                raise ValueError(f"Decode error: {str(e)}")
                
        except Exception as e:
            if self.debug:
                print(f"Error during decode: {str(e)}")
                import traceback
                traceback.print_exc()
            raise

class EncoderRegistry:
    """Registry of available encoders"""
    
    _encoders: Dict[str, Type[GlyphEncoder]] = {}
    
    @classmethod
    def register(cls, name: str, encoder: Type[GlyphEncoder]):
        """Register a new encoder"""
        cls._encoders[name] = encoder
        
    @classmethod
    def get_encoder(cls, name: str) -> GlyphEncoder:
        """Get an encoder by name"""
        if name not in cls._encoders:
            raise ValueError(f"Unknown encoder: {name}")
        return cls._encoders[name]()
        
    @classmethod
    def list_encoders(cls) -> Dict[str, str]:
        """List available encoders and their descriptions"""
        return {name: encoder.__doc__ for name, encoder in cls._encoders.items()}
        
    @classmethod
    def try_decode_all(cls, text: str) -> Dict[str, Tuple[bool, Optional[Dict[str, Any]], Optional[str]]]:
        """Try to decode text with all registered encoders"""
        results = {}
        for name, encoder_cls in cls._encoders.items():
            encoder = encoder_cls()
            results[name] = encoder.try_decode(text)
        return results
        
    @classmethod
    def decode(cls, text: str, encoder_name: str = None) -> Dict[str, Any]:
        """Decode text using specified encoder or try all encoders"""
        if encoder_name:
            return cls.get_encoder(encoder_name).decode(text)
            
        # Try all encoders
        results = cls.try_decode_all(text)
        for name, (success, result, error) in results.items():
            if success:
                return result
                
        # No successful decodes
        errors = {name: error for name, (_, _, error) in results.items()}
        raise ValueError(f"Failed to decode with any encoder: {errors}")

# Register encoders
EncoderRegistry.register("ascii", ASCIIEncoder)
