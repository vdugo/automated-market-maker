import { useState, useEffect } from "react"
import { UseSelector, useSelector } from "react-redux"
import Card from "react-bootstrap/Card"
import Form from "react-bootstrap/Form"
import InputGroup from "react-bootstrap/InputGroup"
import Dropdown from "react-bootstrap/Dropdown"
import DropdownButton from "react-bootstrap/DropdownButton"
import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'

const Swap = () => {
    const [inputToken, setInputToken] = useState(null)
    const [outputToken, setOutputToken] = useState(null)
    const [price, setPrice] = useState(0)

    const account = useSelector(state => state.provider.account)

    const tokens = useSelector(state => state.tokens.contracts)

    const amm = useSelector(state => state.amm.contract)
    
    const getPrice = async () => {
        if (inputToken === outputToken) {
            setPrice(0)
            return
        }
        if (inputToken === 'DAPP') {
            setPrice(await amm.token1Balance() / await amm.token2Balance())
        }
        else {
            setPrice(await amm.token2Balance() / await amm.token1Balance())
        }
    }

    useEffect(() => {
        if(inputToken && outputToken) {
            getPrice()
        }
    }, [inputToken, outputToken])

    return(
        <div>
            <Card style={{ maxWidth: '450px'}} className="mx-auto px-4">
                {
                    account?
                    <Form style={{maxWidth: '450px', margin: '50px auto'}} className="mx-auto px-4">
                        <Row className="my-3">
                            <div className="d-flex justify-content-between">
                                <Form.Label><strong>Input:</strong></Form.Label>
                                <Form.Text muted>Balance:</Form.Text>
                            </div>
                            <InputGroup>
                                <Form.Control 
                                type='number'
                                placeholder='0.0'
                                min='0.0'
                                step='any'
                                disabled={false}
                                />
                                <DropdownButton
                                variant="outline-secondary"
                                title={inputToken ? inputToken : "Select Token"}
                                >
                                <Dropdown.Item onClick={(event) => setInputToken(event.target.innerHTML)}>DAPP</Dropdown.Item>
                                <Dropdown.Item onClick={(event) => setInputToken(event.target.innerHTML)}>USD</Dropdown.Item>
                            </DropdownButton>
                            </InputGroup>
                        </Row>

                        <Row className="my-4">
                            <div className="d-flex justify-content-between">
                                <Form.Label><strong>Output:</strong></Form.Label>
                                <Form.Text muted>Balance:</Form.Text>
                            </div>
                            <InputGroup>
                                <Form.Control 
                                type='number'
                                placeholder='0.0'
                                disabled
                                />
                                <DropdownButton
                                variant="outline-secondary"
                                title={outputToken ? outputToken : "Select Token"}
                                >
                                <Dropdown.Item onClick={(event) => setOutputToken(event.target.innerHTML)}>DAPP</Dropdown.Item>
                                <Dropdown.Item onClick={(event) => setOutputToken(event.target.innerHTML)}>USD</Dropdown.Item>
                            </DropdownButton>
                            </InputGroup>
                        </Row>

                        <Row className="my-3">
                            <Button type='submit'>Swap</Button>
                            <Form.Text muted>
                                Exchange rate: {price}
                            </Form.Text>
                        </Row>
                    </Form>
                    :
                    <p
                    className='d-flex justify-content-center align-items-center'
                    style={{height: '300px'}}
                    >
                        Please Connect Wallet
                    </p>
                }
            </Card>
        </div>
    )
}

export default Swap