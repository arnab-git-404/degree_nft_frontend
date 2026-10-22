import { useState, useEffect } from 'react';
import { Calendar, ExternalLink, Loader2, Award, GraduationCap } from 'lucide-react';

export function CredentialCard({ nft, getNftExplorerLink }) {
  const [metadata, setMetadata] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!nft.uri) return;
      
      setLoadingMetadata(true);
      try {
        const response = await fetch(nft.uri);
        const data = await response.json();
        setMetadata(data);
      } catch (error) {
        console.error("Error fetching metadata:", error);
      } finally {
        setLoadingMetadata(false);
      }
    };

    fetchMetadata();
  }, [nft.uri]);

  return (
    <div className="rounded-none border border-ink/20 bg-paper-soft p-5 hover:border-cobalt hover:shadow-[8px_8px_0_0_rgba(17,16,14,0.10)] transition-all cursor-pointer group">
      {/* NFT Image */}
      {(nft.image || metadata?.image) && (
        <div className="h-48 w-full overflow-hidden rounded-none mb-4 bg-paper-deep relative">
          <img
            src={nft.image || metadata?.image}
            alt={nft.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          {!nft.image && !metadata?.image && (
            <div className="flex items-center justify-center h-full">
              <GraduationCap className="h-16 w-16 text-ink/50" />
            </div>
          )}
        </div>
      )}

      {/* NFT Info */}
      <div className="space-y-2">
        <h4 className="text-lg font-semibold text-cobalt group-hover:text-cobalt transition-colors">
          {nft.name}
        </h4>
        <p className="text-sm text-ink/60">{nft.symbol}</p>

        {/* Description */}
        {metadata?.description && (
          <p className="text-xs text-ink/45 line-clamp-2 pt-2">
            {metadata.description}
          </p>
        )}

        {/* Key Attributes */}
        {loadingMetadata ? (
          <div className="flex items-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-cobalt mr-2" />
            <span className="text-xs text-ink/60">Loading details...</span>
          </div>
        ) : metadata?.attributes && (
          <div className="pt-3 space-y-1.5 border-t border-ink/15">
            {metadata.attributes.slice(0, 3).map((attr, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-ink/45">{attr.trait_type}:</span>
                <span className="text-ink/70 font-medium">{attr.value}</span>
              </div>
            ))}
            {metadata.attributes.length > 3 && (
              <p className="text-xs text-cobalt pt-1">
                +{metadata.attributes.length - 3} more details
              </p>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="pt-3 space-y-1.5 border-t border-ink/15">
          {nft.allocatedAt && (
            <p className="text-xs text-ink/45 flex items-center">
              <Calendar className="h-3 w-3 mr-1.5" />
              Issued: {new Date(nft.allocatedAt).toLocaleDateString()}
            </p>
          )}

          {nft.mintedAt && (
            <p className="text-xs text-ink/45 flex items-center">
              <Award className="h-3 w-3 mr-1.5" />
              Minted: {new Date(nft.mintedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="pt-4 flex gap-2">
          <a
            href={getNftExplorerLink(nft.nftAddress, nft.signature, "address")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-3 py-2 bg-cobalt/10 hover:bg-cobalt/20 border border-cobalt/50 rounded-none text-xs text-cobalt hover:text-cobalt transition-colors flex items-center justify-center gap-1.5"
          >
            View on Explorer
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}