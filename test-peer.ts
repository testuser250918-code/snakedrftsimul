import Peer from 'peerjs';
console.log('Peer:', Peer);
try {
    const p = new Peer();
    console.log('Peer instance created');
    p.destroy();
} catch (e) {
    console.error('Error creating Peer:', e);
}
