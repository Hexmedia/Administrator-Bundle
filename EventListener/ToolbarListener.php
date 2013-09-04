<?php
/**
 * Created by JetBrains PhpStorm.
 * User: krun
 * Date: 04.09.13
 * Time: 17:30
 * To change this template use File | Settings | File Templates.
 */

namespace Hexmedia\AdministratorBundle\EventListener;


use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\FilterResponseEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\SecurityContext;

class ToolbarListener implements EventSubscriberInterface
{
    /**
     * @var SecurityContext
     */
    private $security;
    /**
     * @var \Twig_Environment
     */
    private $twig;

    /**
     * @param SecurityContext $security
     */
    public function __construct(SecurityContext $security, \Twig_Environment $twig)
    {
        $this->security = $security;
        $this->twig = $twig;
    }

    public static function getSubscribedEvents()
    {
        return array(
            KernelEvents::RESPONSE => array('onKernelResponse', -128),
        );
    }

    public function onKernelResponse(FilterResponseEvent $event)
    {
        if (HttpKernelInterface::MASTER_REQUEST !== $event->getRequestType()) {
            return;
        }

        $response = $event->getResponse();
        $request = $event->getRequest();

        // do not capture redirects or modify XML HTTP Requests
        if ($request->isXmlHttpRequest()) {
            return;
        }

        //User need to be at least editor to use this.
        if (!$this->security->isGranted('ROLE_EDITOR')) {
            return;
        }

        //I know it's not beautiful solution, but currently i've no idea how I can do it properly.
        $requestUri = str_replace($request->getBasePath(), "", $request->getRequestUri());

        $requestUri = str_replace("/app_dev.php", "", $requestUri);
        $requestUri = str_replace("/app.php", "", $requestUri);

        if (substr($requestUri, 1, 5) == "admin") {
            return false;
        }

        $this->injectToolbar($response, $request);
    }

    /**
     * Injects the web debug toolbar into the given Response.
     *
     * @param Response $response A Response instance
     */
    protected function injectToolbar(Response $response, Request $request)
    {
        if (function_exists('mb_stripos')) {
            $posrFunction = 'mb_strripos';
            $substrFunction = 'mb_substr';
        } else {
            $posrFunction = 'strripos';
            $substrFunction = 'substr';
        }

        $content = $response->getContent();
        $pos = $posrFunction($content, '</body>');

        if ($pos !== false) {
            $session = $request->getSession();

            $editMode = $session->get('hexmedia_content_edit_mode') === true;

            $toolbar = $this->twig->render(
                "HexmediaAdministratorBundle:Toolbar:toolbar.html.twig",
                [
                    'edit_mode' => $editMode,
                    'edit_mode_class' => $editMode ? 'in-edit-mode' : ''
                ]
            );

            $content = $substrFunction($content, 0, $pos) . $toolbar . $substrFunction($content, $pos);

            $response->setContent($content);
        }
    }
}