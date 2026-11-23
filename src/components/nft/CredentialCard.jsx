import { useState, useEffect } from 'react';
import { Calendar, ExternalLink, Loader2, Award, GraduationCap, QrCode, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

export function CredentialCard({ nft, getNftExplorerLink }) {
  const [metadata, setMetadata] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [showShare, setShowShare] = useState(false);
  // The stable public link anyone can open (or scan) to check this credential.
  const verifyUrl = `${window.location.origin}/verify/${nft.nftAddress}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success('Verification link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

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
    <div className="group flex flex-col overflow-hidden rounded-xl border border-ink/10 bg-paper-soft transition-colors hover:border-cobalt/50">
      {/* NFT Image */}
      {(nft.image || metadata?.image) && (
        <div className="relative h-28 w-full overflow-hidden bg-paper-deep">
          <img
            src={nft.image || metadata?.image}
            alt={nft.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          {!nft.image && !metadata?.image && (
            <div className="flex h-full items-center justify-center">
              <GraduationCap className="h-10 w-10 text-ink/50" />
            </div>
          )}
        </div>
      )}

      {/* NFT Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div>
          <h4 className="truncate text-[14px] font-semibold text-cobalt">
            {nft.name}
          </h4>
          <p className="text-[12px] text-ink/50">{nft.symbol}</p>
        </div>

        {/* Description */}
        {metadata?.description && (
          <p className="line-clamp-2 text-[12px] text-ink/50">
            {metadata.description}
          </p>
        )}

        {/* Key Attributes */}
        {loadingMetadata ? (
          <div className="flex items-center gap-1.5 py-1 text-[12px] text-ink/55">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cobalt" />
            Loading details...
          </div>
        ) : metadata?.attributes && (
          <div className="space-y-0.5 border-t border-ink/10 pt-1.5">
            {metadata.attributes.slice(0, 3).map((attr, idx) => (
              <div key={idx} className="flex justify-between gap-2 text-[12px]">
                <span className="shrink-0 text-ink/45">{attr.trait_type}</span>
                <span className="truncate font-medium text-ink/75">{attr.value}</span>
              </div>
            ))}
            {metadata.attributes.length > 3 && (
              <p className="text-[12px] text-cobalt">
                +{metadata.attributes.length - 3} more details
              </p>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="flex flex-wrap gap-x-3 border-t border-ink/10 pt-1.5 text-[12px] text-ink/45">
          {nft.allocatedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Issued {new Date(nft.allocatedAt).toLocaleDateString()}
            </span>
          )}

          {nft.mintedAt && (
            <span className="flex items-center gap-1">
              <Award className="h-3 w-3" />
              Minted {new Date(nft.mintedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Share: verification link + QR */}
        {showShare && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-ink/10 bg-white p-3">
            <QRCodeSVG value={verifyUrl} size={132} marginSize={1} aria-label="QR code of the verification link" />
            <button type="button" onClick={copyLink} className="flex items-center gap-1 text-[12px] font-medium text-cobalt">
              <Copy className="h-3 w-3" /> Copy verification link
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowShare((value) => !value)}
          aria-expanded={showShare}
          className="mt-auto flex h-7 items-center justify-center gap-1 rounded border border-ink/15 text-[12px] font-medium text-ink/70 transition-colors hover:bg-ink/5"
        >
          <QrCode className="h-3 w-3" /> {showShare ? 'Hide QR' : 'Share / verify'}
        </button>

        {/* Actions */}
        <a
          href={getNftExplorerLink(nft.nftAddress, nft.signature, "address")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-7 items-center justify-center gap-1 rounded border border-cobalt/40 bg-cobalt/5 text-[12px] font-medium text-cobalt transition-colors hover:bg-cobalt/15"
        >
          View on Explorer
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
