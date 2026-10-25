use owned_reference_contract::{label, order, reference};

#[test]
fn public_contract_has_real_behavior() {
    assert_eq!(reference::normalize_reference("A-12"), "A-12");
    assert_eq!(label::display_label("A-12"), "A-12");
    assert!(order::ordered_references(&[]).is_empty());
}
